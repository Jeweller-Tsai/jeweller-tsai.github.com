---
layout: post
title: 无家可归的代码（1）
category: RubyOnRails
tags: 程序设计 DecoratorPattern
---

###“我无家可归！”


**系统太臃肿？设计有问题？问题太复杂？**

"Fat model, skinny
controller"被视为金科玉律，广为Rubyists所知和推崇。系统慢慢长大……直到有一天（实际上用不了几天），它变成了一个胖子。你发现你的代码没有了容身之处，无家可归！

为什么这样说呢？你有没有发现有些代码，既不适合放在model，也不适合放在controller，更别提view了。举个例子，现在需要在页面显示文章的显示时间，以这样的格式`2012-03-29 21:55:29`显示，怎么做？在model里写方法吗？简单！

{% highlight ruby %}
  def formatted_created_at
    created_at.strftime('%Y-%m-%d %H:%M:%S')
  end

  #或许你喜欢用原来的名字

  alias old_created_at created_at

  def created_at
    old_created_at.strftime('%Y-%m-%d %H:%M:%S')
  end
{% endhighlight %}


>    “你居然把展示曾的东西写在model里面？”

>    “有什么问题吗？Fat model阿!”

>    “……”


要不然你要写在哪？写helper吗，helper一点也不OO阿!不用，Rails已经为我们提供好了方法！

{% highlight ruby %}
  post.created_at.to_formatted_s(:db)
{% endhighlight %}

Rails总是那么贴心！问题又来了。你肯定有写过table，一个一个属性列出来是不是很蛋疼？有没有想过这样：

{% highlight haml %}
  %tr
    - attrs.each do |attr|
      %td= @instance.send attr
{% endhighlight %}

貌似不错，够DRY。可是我怎么用`to_formatted_s`？怎么用`number_to_currency`?我中间又要加一些判断，这样写起来跟我直接一个一个写没什么两用，可读性更差！

###给你的代码找个归宿

接下来必须扯一点设计模式，水平有限，纯抛砖。

就上文所提到的问题，是View层的一些逻辑问题，主要是model如何自我展现的问题。Ruby被冠以“完全面向对象”的编程语言的头衔，但是许多时候我们的代码并不OO.人家不免要问，

>    “你不是面向对象吗？为什么你这个对象不知道要以什么形式来展现自己，而是需要那么多的条件判断？”

>    “就算你写了helper,在你的price前面加个number_to_currency算是怎么回事？message在哪，receiver在哪？”

>    “……”

其实，这类问题在Rails社区早就被广泛讨论。现在大概有Presenter模式，Decorator模式，Delegation模式，都是非常好的想法，确实能漂亮的解决实际问题。就Decorator模式，有非常受欢迎的[darper][1]，相关介绍可以看[这里][1]。Decorator模式的类图如下：

![Decorator Pattern](/public/images/2012-03-29-1.png '装饰器模式')

实现的方式也非常简单，你可以用继承，但是更加rubyish的做法是动态的include一个module。Duck Typing让我们不用像Java那样去定义公共接口，写相同的方法名即可。[darper][1]用的也是[这种做法][2],甚至可以这样：

{% highlight ruby %}
  module MyDecorator
    def foo; end
  end

  Object.new.extend MyDecorator
{% endhighlight %}

动态的为一个对象增加功能，非常漂亮，很好的体现Ruby的灵活性。那么上文的提到的问题，用[draper][1]解决起来非常简单。

{% highlight ruby %}
  class ApplicationDecorator < Draper::Base
    # 这里可以定义一些共享的方法, 例如
    def created_at
      model.created_at.to_formatted_s :db
    end
  end

  class ProductDecorator < ApplicationDecorator
    decorates :product
  
    def price
      h.number_to_currency product.price
    end
    # ...
  end

  # 调用
  ProductDecorator.decorate @product
{% endhighlight %}

你不但可以复写原有的方法，也可以创建新的方法，这个一个普通的类没有什么区别。

{% highlight ruby %}
  # 用户的联系方式可能是手机，也可能是电话，而者至少有一个
  # 优先显示手机
  def contact
    user.try(:mobile) || user.tel
  end
{% endhighlight %}

这样，你可以直接在View中把需要的属性直接读出来，而省去了许多条件判断和helper，看看上文table的例子，变得相当简洁了。这样做的另外一个好处是，一旦需要修改展示形式，你只需要改动一处代码，View就做出相应变化，而不再像以前那样要去`grep`了。更多的例子请看[这里][2]

###总结

到这里，初步解决了展示model代码的归宿问题了。不属于model，不属于controller的代码，现在可以用一个Decorator来解决，也不需要写不OO的helper了。这样做的好处是抽离出展示层的代码，尽量降低View的逻辑，严防model的虚胖，保持controller的骨感。

注意：上文所提到的写helper不够OO，并非所有的场景都不适合写helper，本人不排斥helper，这里所指部分是与model紧密关联的部分不适合用helper

下一篇文章会分析另外一些[“无家可归的代码”][3]，并尝试解决问题。

[1]: https://github.com/jcasimir/draper
[2]: https://github.com/jcasimir/draper/blob/master/lib/draper/base.rb#L54
[3]: /RubyOnRails/2012/03/30/homeless-code-2/
