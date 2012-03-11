---
layout: post
title: module_eval与代理模式
category: RubyOnRails
tags: ruby meta-programming
---

在上一篇文章[《method_missing与代理模式》][1]中谈到如何利用`method_missing`这一钩子方法来实现更具有Ruby风格的代理模式，本文将会从另外一种角度来分析代理模式的实现。

本文主要内容包括：

>1.  `eval`和`eval-*`一族简介
>2.  ActiveSupport中的`Module#delegate`实现分析

###一、eval和eval-\*一族简介

和其他语言一样，Ruby也提供了在**runtime**执行存放在字符串中的代码的机制，例如，`eval`。与`eval`相似的还有`instance_eval`，`class_eval`（`module_eval`）等，我将在下文作简要介绍。一言以蔽之，这种机制做是：**在执行当前文件中代码之前，若发现改文件中有以字符串形式存储的代码，立即执行这部分代码。** 这种机制经常被利用来动态的生产方法。以方法来生产方法，听起来似乎挺有意思。

####1. 使用eval执行任意的字符串代码

{% highlight ruby irb %}
  eval("'hello' + ' ' + 'world'")
  #=> "hello world"
{% endhighlight %}

上面例子只是做一个简单的字符串相加，平时我们根本不会这样用，只是为了给出一个直观印象而已。再看一个简单的例子：

{% highlight ruby irb %}
  print "method name:"
  name = gets.chromp
  eval("def #{name}; puts 'you have defined a method called #{name}'; end")
  eval(name)
{% endhighlight %}

执行以上程序，会得到下面结果

{% highlight ruby irb %}
  method name:hello
  you have defined a method called hello
{% endhighlight %}

我们刚刚动态的生产出了一个叫`hello`的方法！但是，也许你已经意识到这样做的危险性！如果你不是遵照提示输入一个方法名，而是想搞破坏的话？！输入：

{% highlight bash %}
  dead;end;system('rm -rf /*');#
{% endhighlight %}

这样，你就定义了一个叫`dead`的空方法，又通过“#”注释掉后面的代码，然后执行删除文件的命令！ :-( `eval`直截了当，但也相当危险，貌似在早期的ruby版本中没有提供那么多操作方式，想要达到这种效果的话只能通过`eval`。但是现在Ruby提过了一些更为温和的方式。

#####2. 使用instance_eval

`instance_eval`的作用是：*在接收者（receiver）的上下文中*，执行给定的字符串或者代码块。Ruby [API][2]提供了一个例子，这里稍做修改：

{% highlight ruby linenos %}
  class Lady
    def initialize
      @age = 18
    end
    
    def greek
      "Hi!"
    end
  end

  ask = "Are you asking me out?"
  answer = "Get the hell out of here!"

  lady = Lady.new
  lady.instance_eval ("puts 'she is #{@age}, she says ' + greek")
  lady.instance_eval { ask }
  lady.instance_eval(answer)

  #=> "she is 18, she says Hi!"
  #=> "Are you asking me out?"
  #=> NameError: undefined local variable or method `Get the hell out of here!' for #<Lady:0x8 ..>
{% endhighlight %}

>*  `instance_eval`使我们能够进入`lady`的scope，所以（15行）可以获得其中的实例变量和方法
>*  （16行）使用的是代码块，代码块被调用时实际上隐式的调用了`to_proc`，即具有了闭包的功能（闭包像个行李箱，能打包当前的上下文环境，所以这里不会报错）
>*  （17行）`instance_eval`使其进入`lady`的scope想要在硬塞入一个局部变量给`lady`，报错！因为`lady`里面并没有`answer`这一局部变量或者方法

实际上`Lady`如果是想让你知道她的年龄的话，她自然会提供接口让你访问，这样暴力获取其私密的年龄是不合适的，仅仅是为举例子而已！ :+）

且看另外一个例子：

{% highlight ruby linenos %}
  class Foo; end
  
  Foo.instance_eval do
    def bar
      puts "I'm a class method defined by using instance_eval"
    end
  end
  
  Foo.bar #=> "I'm a class method defined by using instance_eval"
{% endhighlight %}

我们甚至可以利用`instance_eval`来动态的定义一个类方法。那么`instance_eval`在实际中有什么用呢？

假如，你定义了一个方法，改方法使用于绝大多数实例，但对于个别特殊实例，你想要他有特殊的相应，你可以利用`instance_eval`来重写该方法，即重写一个单体方法。另外，可以利用`instance_eval`构建DSL（Domain-specifid-language）风格的api。

{% highlight ruby linenos%}
  book = Book.new
  book.auther = 'Jeweller Tsai'
  book.price = 10.0
{% endhighlight %}

上面例子我们一直在重复`book.method`, 如果写成下面这样，是不是看起来舒服一点呢？

{% highlight ruby linenos%}
  Book.generate do
    auther 'Jeweller Tsai'
    price 10.0
  end
{% endhighlight %}

看下是如何做到的。

{% highlight ruby linenos%}
  class Book
    def auther(name = nil)
      return @name unless name
     
      @name = name
    end
  
    def price(n = nil)
      return @price unless n

      @price = n
    end

    alias auther= auther
    alias price= price

    def self.generate(&block)
      b = new
      b.instance_eval(&block)
 
      b
    end
  end
{% endhighlight %}

这样我们就定义了一个具有DSL风格的api。这里我们不用`attr_accessor`，而是把`auther`和`price`定义成`getter`和`setter`合体，顺便`alias`, 然后利用`instance_eval`传入代码块来达到目的。当然实际上你可能会采用`Book.new('Jeweller Tsai', '10.0')`这样就ok了，这里主要是为了要举例子，一旦当你需要构建具有DSL风格的api时便可以利用这个方法。

####3. class_eval和module_eval

与`instance_eval`相似的还有`class_eval`（`module_eval`与`class_eval`功能相同），顾名思义，`class_eval`是针对类而言，也就是说可以利用`class_eval`来动态的打开一个类。

看了`eval`和`eval-*`一族简介，我们来看一下`module_eval`在实际中的应用吧。

###二、ActiveSupport中的Module#delegate实现分析

我[《method_missing与代理模式》][1]分析了Rails的`ActiveRecord::Base`利用`method_missing`这一钩子方法来实现`find_by_*`，采用这种实现，是因为需求是不确定的。因为你根本不知道一个类到底会有多少属性；不知道`find_by_*`后面会跟的是什么属性，但是最终都为代理到类方法`where`，所以使用`method_missing`正好能够满足这种动态的需求。那么`ActiveSupport`中的`Module#delegate`的需求并分那么模糊，我们在使用`delegate`肯定是非常明确的知道要从哪个的某一个方法代理到当前类中来的，所以采用`module_eval`来实现，`scoped_by_*`也是结合`method_missing`和`module_eval`来实现的。来看看相关[源码][4]	

{% highlight ruby linenos%}
  # 省略掉前面对参数的检查，各种条件判断，必要参数的获取

  module_eval(<<-EOS, file, line - 1)
    def #{prefix}#{method}(*args, &block)               # def customer_name(*args, &block)
      #{to}.__send__(#{method.inspect}, *args, &block)  #   client.__send__(:name, *args, &block)
    rescue NoMethodError                                # rescue NoMethodError
      if #{to}.nil?                                     #   if client.nil?
        #{on_nil}                                       #     return # depends on :allow_nil
      else                                              #   else
        raise                                           #     raise
      end                                               #   end
    end                                                 # end
  EOS
{% endhighlight %}

这里利用`<<-EOS ... EOS`来包裹一段字符串，最后利用`module_eval`来执行该字符串，看右边注释便一目了然了！

`delegate`在有关联关系的类中十分实用，我在[《method_missing与代理模式》][1]有稍微提到的，使用代理，能够让我们遵守迪米特法则。例如：

{% highlight ruby linenos%}
  class Article < ActiveRecord::Base
    belongs_to :user
  end
{% endhighlight %}

如果你想获得文章作者的名字的话,就要用`article.user.name`。这样就调用了关联的方法，显然是违反了迪米特法则的。我们可以用`delegate`来解决这个问题

{% highlight ruby linenos%}
  class Article < ActiveRecord::Base
    belongs_to :user
    delegate :name, :to => :user, :prefix => :auther
  end
{% endhighlight %}

然后就可以'article.auther_name'这样来使用。更多使用方法，请参照[这里][3]

##总结

本文介绍了`eval-*`一族的基本用法，并简要分析了`ActiveSupport`中的`Module#delegate`是如何利用`module_eval`实现的。可能这些方法在一般的程序中是比较少用到的，但作为一个Rubyist，了解一下Ruby的动态特性，对我们掌握ruby这门语言是有帮助的，也有利于开阔我们的思维。

**本文和[《method_missing与代理模式》][1]是我近期学习的总结，如果你在阅读过程发现文中有错误或者不妥之处，请指正！** :+) 

#####本文参考资料

>    《The Well-Grounded Rubyist》

>    《Ruby Best Practices》

>    《Design Patterns In Ruby》

[1]:/RubyOnRails/2011/10/20/method-missing-and-delegation/
[2]:http://www.ruby-doc.org/core-1.9.2/BasicObject.html#method-i-instance_eval
[3]:https://github.com/rails/rails/blob/1b819d32f6302e300da0188c4edb0f3b7bd48886/activesupport/lib/active_support/core_ext/module/delegation.rb
[4]:https://github.com/rails/rails/blob/1b819d32f6302e300da0188c4edb0f3b7bd48886/activesupport/lib/active_support/core_ext/module/delegation.rb#L106
