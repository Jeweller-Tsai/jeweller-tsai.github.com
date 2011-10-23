---
layout: post
title: method_missing与代理模式
category: RubyOnRails
---

最近在学习Ruby的动态特性，作此文以梳理近期所学知识。

本文主要内容包括：

>1.  ruby中方法的查找顺序
>2.  `method_missing`的使用
>3.  `Object#send`的使用
>4.  代理模式的ruby实现
>5.  rails中`find_by_*`分析

###一、Ruby中方法的查找顺序

首先，我们通过一个简单的例子在了解Ruby中的继承顺序。

{% highlight ruby irb %}
  module M; end
  
  module N; end

  class C; end

  class D < C
    include M
  end

  object = D.new
  class << object
    include N
    p ancestors
  end

  # => [N, D, M, C, Object, Kernel, BasicObject]
{% endhighlight %}

在上面例子中，首先定义了module M和N，然后定义class C和D，其中Ｃｉｎｃｌｕｄｅ了Ｍ，Ｄ继承自Ｃ。我们通过`class << object; end`来让“隐身”的`singleton class`现身，然后在`object`的`singleton class`include module N, 然后打印出`object`的`ancestors`
。从输出的结果，我们可以清楚的看到Ｒｕｂｙ中的继承顺序。（其中，ｏｂｊｅｃｔ本身没有输出）这也说明了Ｒｕｂｙ中方法的查找也将会延该顺序进行查找。如图所示：

![继承树](/public/images/2011-10-20-1.png " 查找树")

>1.  先查找单体类中是否定义改方法；是则执行该方法，否则转２
>2.  是否引入ｍｏｄｕｌｅ，是则查找该ｍｏｄｕｌｅ是否定义，否则转３
>3.  查找其原来的类（即Ｄ）是否定义改方法，依此类推，往继承树上查找

那么，如果一直延继承树向上查找，直至`BasicObject`,仍旧没有找到，此时便报`NoMethodError`。对于这个错误，ｒｕｂｙｉｓｔ应该再熟悉不过了。

###二、使用method_missing来捕获异常

为了能这个错误进行相应处理，Ｒｕｂｙ提供了一个`hook`, here comes the
magic `method_missing`!
延续上面例子，让我们再通过一个例子来看看`method_missig`如何工作的。

{% highlight ruby irb linenos %}
  class << object
    def method_missing(method_id, *args, &block)
      case(method_id.to_s)
      when /^foo$/
        puts "tried to call #{method_id} on #{self}"
        puts "which caused a disaster"
      else
        super
      end
  end
{% endhighlight %}

此时，如果我们向ｏｂｊｅｃｔ发送ｆｏｏ消息

{% highlight ruby irb %}
  object.foo 
  # =>
    tried to call foo on #<D:0x97..>
    which caused a disaster
{% endhighlight %}

那，如果向ｏｂｊｅｃｔ发送ｂａｒ消息

{% highlight ruby irb %}
  object.bar
  # =>
    NoMethodError: undefined method `bar' for #<D:0x97..>
{% endhighlight %}

这里`bar`并没有在我们所定义的`method_missig`中被捕获，而是`super`一直向上冒泡，在顶层才被捕获的。可以肯定，顶层的某一个类中也是实现了`method_missing`。现在，我们就可以在一个高层类中定义该方法，以实现对一些`NoMethodError`进行相应处理。所以，在这里也必须强调一点：

*  当使用`method_missing`时，切记在末尾调用`super`！否则，有可能部分错误没有被捕获，而你的程序却变成了一只沉默的羔羊，不会给出任何提示！

然而，我们能做的远远不止与此。　

###三、使用Object#send来发送消息

直接看看ｒｕｂｙ的[API](http://www.ruby-doc.org/core-1.9.2/Object.html#method-i-send)中的例子：

{% highlight ruby irb linenos %}
  class Klass
    def hello(*args)
      "Hello " + args.join(' ')
    end
  end

  k = Klass.new
  k.send :hello, "gentle", "readers"   #=> "Hello gentle readers"
{% endhighlight %}

为什么要用`k.send(:hello, "gentle",
"readers")`？一般情况下，直接用`k.hello`就ＯＫ了阿。如果將其与`method_missing`结合起来呢？

延续上面例子：

{% highlight ruby irb linenos %}
  def goodbye(*args)
    puts "goodbye" + args.join(' ')
  end

  def method_missing(method_id, *args, &block)
    case(method_id.to_s)
    when /^say_(.*)/
      send($1, *args)
    when /^say_hello_and_(.*)$/
      hello
      send($1, *arg)
    else
      super
    end
  end

  #这样我们就提供了
  # say_hello(*args)                  #=> hello(*args)
  # say_hello_and_goodbye(*args)      #=> hello(*args); goodbye(*args)
{% endhighlight %}

###四、Delegation Pattern的ruby实现

![代理模式](/public/images/2011-10-20-2.png)

由上图，如果我们要在程序中实现代理模式的话,可能会是：

{% highlight ruby linenos %}
  class Service
    def mothod1; end
    def mothod2; end
    # ...
  end

  class ServiceProxy
    def initialize(real_service)
      @service = real_service
    end
  
    def proxy_method1(method_id, *args, &block)
      do_something                              # 如权限控制之类，anything
      @service.method1
    end
  
    def proxy_method2(method_id, *args, &block)
      do_another_thing
      @service.method2
    end

    # ...
    
    def do_something; end
    def do_another_thing; end
  end
  
{% endhighlight %}

但是如果Service中有很多方法呢，一个个方法这样包裹起来显然违背了DRY原则！

用`method_missing` + `send`, 让代码更加rubyish！

{% highlight ruby linenos %}

  class ServiceProxy
    def initialize(real_service)
      @service = real_service
    end
    
    def method_missing(method_id, *args, &block)
      case(method_id.to_s)
      when condition1
        do_something
      when condition2
        do_another_thing
      # ...
      else
        super
      end
      
      @service.send(method_id, *args, &block)
    end
    
    def do_something; end
    def do_another_thing; end
  end
{% endhighlight %}

其实代理模式说到底非常简单，几乎在我们平时编程的过程中都会自然而然的用到，说到底无非不就是用一个新方法将另外一个方法包装起来。不过这样说起来，代理模式似乎只为增加CPU负担。我自己在rails中常用到的是`delegate`方法，这样做的目的是遵循The Law Of Demeter，降低类与类之间的耦合度。 另外，使用代理，也可以将对象的生成延迟至必要时刻。这只是个人的理解，还有待以后在实践中提高。

###五、rails中的find_by_\*的实现

文章讲到这里，`method_missing`和`send`的威力可见一斑，剩下的就是在实践了。Before you get your hands dirty，让我们来看看在现实中的使用情况吧！

Rails中提供`find_by_*`一族是不是很神奇呢？例如， `User.find_by_user_name`。虽然我们自己并没有定义`find_by_user_name`的方法，但是只要`User`是继承自`ActiveRecord::Base`，我们都能免费的享用这些方法。magic？也许你已经猜到答案了！ `method_missing`!

显然，Rails中的`find_by_*`和`scoped_by_*`一族的功能是非常强大的，从[这里](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/base.rb#LC169)
可以看到能够实现的各种功能的介绍。[源码](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/base.rb#LC1050)中分多中情况进行处理，代码相当健壮。本文将试着从其中的`find_by_*`作相应简化，可能考虑的情况不周全。

{% highlight ruby linenos %}
  class Base
    private
      
      def method_missing(method_id, *args, &block)
        case method.to_s
        when /^find_by_([_a-zA-Z]\w*)$/
          attr_names = $1.split('_and_')    
          conditions = Hash[attr_names.map {|a| [a, arg[attr_names.index(a)]]}]
          relation = scoped
          relation.send(:where, conditions).first
        else
          super
        end
      end
  end
{% endhighlight %}

以上就是`find_by_*`的简单实现。显然，不是很健壮，例如，你可以`find_by_name_and_name_and_name`。如果有兴趣，可以对这段[源码](https://github.com/rails/rails/blob/master/activerecord/lib/active_record/base.rb#LC1050)继续深入研究，其中做了相当多的条件判断，控制流也较为复杂，当然，健壮性高了许多！

从这样源码的分析中，大家也就意识到要使用`find_by_*`一族须谨慎，虽然很方便，不用自己去写`where`，但是，效率也降低了！例如，当调用`find_by_user_name`时，从`User`开始一路冒泡，直至`BasicObject`，找不到之后才调用到`Base`的`method_missig`，再经过对字符串的处理，各种条件判断，最终才是`where`！！！

另外`scoped_by_*`这一族的方法，在第一次调用之后，改方法就存在了，如果经常用到某个`find_by_`，可以考虑换成`scoped_by_`。

###总结

通过这两天对Ruby中动态特性的学习，慢慢领略到Ruby的正真魅力。

一点学习经验就是，2-3本书同时读，可以帮助自己对同一个知识点的深入理解。另外，我并没有对rails的源码进行全面的研读，只是碰到有兴趣的，可能就会找时间看看。另外一个原因，是rails太庞大，我还不知道从何处下手。如果你已经读过，可以分享一下经验。 ：+）

**本文主要目的是抛砖引玉，欢迎讨论。如果文中有不妥之处或者错误，请指正！**

#####本文参考资料

>    《The Well-Grounded Rubyist》

>    《Ruby Best Practices》

>    《Design Patterns In Ruby》








