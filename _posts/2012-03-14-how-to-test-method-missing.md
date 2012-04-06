---
layout: post
title: How to test method_missing
category: RubyOnRails
tags: ruby meta-programming
---
我在之前的文章[《method_missing与代理模式》][1]和[《module_eval与代理模式》][2]对`method_missing`有过较为详细的介绍，当时我正在学习ruby的动态特性，但是几个月过去了，我一直没有机会用到这个magic。今天和同学结对编程，发现相似的方法方法写了3个，并且为3个方法都分别写了测试。3应该是个临界点，再过则有违背DRY之嫌。而且我们最后整理出来，可能相似的方法要增加到8个，于是`method_missing`有了用武之地。不过本篇文章重点不是`method_missing`，而是对其做相应测试。如对`method_missing`还不了解，请参详[这里][1]和[这里][1]。

###一、代码重复

重复代码如下：

{% highlight ruby linenos %}
  def paid_orders
    orders.where(state_cd: RightnowOms::Order::STATUS.index(:paid))
  end

  def preparing_orders
    orders.where(state_cd: RightnowOms::Order::STATUS.index(:preparing))
  end

  def cancled_orders
    orders.where(state_cd: RightnowOms::Order::STATUS.index(:cancled))
  end
{% endhighlight %}

其中`RightnowOms::Order::STATUS`是一个数组，随着需求变化，现在这个数组的`size`是8，也就是说`*_orders`的这种方法将达到8个之多，自然不能容忍。如果说项目实在很赶，可以复制粘帖，但记得加个**TODO**，回头再重构。测试代码如下：

{% highlight ruby linenos %}
  describe 'retrieve orders by status' do
    before :all do
      @user = Factory :user
      order_hash = fake_order_hash(1).merge(user_id: @user.id)
      @paid_order = RightnowOms::Order.create_with_items(order_hash.merge(state: :paid))
      @preparing_order = RightnowOms::Order.create_with_items(order_hash.merge(state: :preparing))
      @cancled_order = RightnowOms::Order.create_with_items(order_hash.merge(state: :cancled))
    end

    describe '#paid_orders' do
      subject { @user.paid_orders }

      it { should have(1).item }
      it { should include @paid_order }
    end

    describe '#preparing_orders' do
      subject { @user.preparing_orders }

      it { should have(1).item }
      it { should include @preparing_order }
    end

    describe '#cancled_orders' do
      subject { @user.cancled_orders }

      it { should have(1).item }
      it { should include @cancled_order }
    end
  end
{% endhighlight %}

每个状态的`order`都提供一个，然后测试查找出来的`order`与该状态相对应。

###二、重构

下面为重构后代码：

{% highlight ruby linenos %}
  def method_missing(m, *args, &block)
    matches = /(\w+)\_orders/.match(m.to_s)
    if matches
      orders.where(state_cd: RightnowOms::Order::STATUS.index(matches[1].to_sym))
    else
      super
    end
  end
{% endhighlight %}

代码很简单，只是用正则表达式把missing的方法名给取出来，方法体和原来一样。如果`matches`是`nil`的话，进入`super`,这会一路向上调用`method_missing`,直到`Kernel#method_missing`。

代码变得相当简洁，但却完成了更多的功能,但是测试怎么办？测试中也有很多重复的部分，但你写出了dry的方法，很自然的也就无法容忍测试代码很wet既然重构了方法，那肯定要一鼓作气，不要让code smell蔓延。下面是重构后的测试代码：

{% highlight ruby linenos %}
  describe 'order status' do
    before(:each) do
      @user = Factory :user
      order_hash = fake_order_hash(1).merge(user_id: @user.id)

      RightnowOms::Order::STATUS.each do |s|
        instance_variable_set("@#{s}_order",
                              RightnowOms::Order.create_with_items(order_hash.merge(state: s)))
      end
    end

    RightnowOms::Order::STATUS.each do |s|
      describe "##{s}_orders" do
        subject { @user.send("#{s}_orders") }

        it { should have(1).item }
        it "retrieval paid orders" do
          should include instance_variable_get("@#{s}_order")
        end
      end
    end
  end
{% endhighlight %}

WOW!测试也变得相当简洁了！这里用了[Object#instance_variable_set][4]来给实例变量赋值和[Object#instance_variable_get][3]来将实例变量的值取出来，才让代码变得dry。另外，

`instance_variable_get`和`instance_variable_set`是`Object`的实例方法，也就是说必须这样

{% highlight ruby %}
  obj.instance_variable_get(sym)
{% endhighlight %}

上文测试的例子中实际是是省略了`self`,如果你断点到哪里然后调用`self.class`

{% highlight ruby %}
  self.class # => RSpec::Core::ExampleGroup::Nested_1
{% endhighlight %}

###总结

**好代码是改出来的！**工作时我们遵循"Done is better then
perfect"的原则，先实现功能，但功能实现了之后，如果有时间，应该回过来来看看自己写的代码，能重构则重构，这样才能写出有质量的代码，才能不断的提高自己。

即便是Red,Green,Refactor这个circle有时的确很烦人，很费时，但确实有其价值！

###更新

`method_missing`看起来相当不错，但也带来了一定的效率问题。为此，可以尝试在捕获到这个方法的同时，动态的定义这个方法，以提高效率。以下是重构后的代码：

{% highlight ruby linenos %}
  def method_missing(m, *args, &block)
    matches = /(\w+)\_orders/.match(m.to_s)
    if matches
      state = RightnowOms::Order::STATUS.index(matches[1].to_sym)
      # define_method是属于Class类的私有方法，必须用send调用
      self.class.send(:define_method, matches[0].to_sym) do
        self.orders.where(state_cd: state)
      end
      orders.where(state_cd: state)
    else
      super
    end
  end
{% endhighlight %}

这样做的好处是，一旦某个被`method_missing`捕获,并符合条件，此时我们动态的定义这个方法，以后当我们再次调用时，此方法就想其他普通方法一样，直接被调用，而不再触发`method_missing`，从而提高了性能。

下面是对应的测试：

{% highlight ruby linenos %}
  # 本段测试应位于上文测试中的循环里
  context 'after calling method_missing' do
    before { @user.send("#{s}_orders") }
    it 'should not hit method_missing again' do
      @user.should_not_receive(:method_missing)

      # 由于上文把subject定义成：
      # subject { @user.send("#{s}_orders") }
      # 这样是写少了一点点代码，可是带来的问题是可读性较差
      subject
    end
  end
{% endhighlight %}

[1]:/RubyOnRails/2011/10/20/method-missing-and-delegation/
[2]:/RubyOnRails/2011/10/23/module-eval-and-delegation/
[3]:http://www.ruby-doc.org/core-1.9.3/Object.html#method-i-instance_variable_get
[4]:http://www.ruby-doc.org/core-1.9.3/Object.html#method-i-instance_variable_set
