---
layout: post
title: Extracts Shared Methods Into A Module
category: RubyOnRails
tags: DRY
---

### Don't repeat yourself

Rubyists应该非常熟悉[DRY][1]了。在我们日常的编程过程中，应该时刻注意自己的代码是不是够DRY。让自己代码DRY的方式有许多，本文将介绍一种常用的方法，即，把重复的代码提炼到`module`中，然后再`include`到目标类中。本文包括：

1.  实例分析重复代码
2.  复代码，引入模块以及测试
3.  分析设计的优劣

下面例子中，是一个简单的`Notification`类，该类属于`sender`和`receiver`。

{% highlight ruby %}
  class Notification < ActiveRecord::Base
    belongs_to :sender, polymorphic: true
    belongs_to :receiver, polymorphic: true
    # ...
  end
{% endhighlight %}

注意其中用到了多态，也就是说，通知的接收者和发送者都可以是不同的类型。

{% highlight ruby linenos %}
  class Employee < ActiveRecord::Base
    has_many :notifications, as: :receiver
    # ...
  end
  
  class User < ActiveRecord::Base
    has_many :notifications, as: :receiver
    # ...
  end
{% endhighlight %}

`employee`和`user`都可以充当`receiver`（注：由于其他原因，必须把`Employee`和`User`作为两个类区别对待，这里不作详细说明）。当看到多态时，我们应该意识到可能出现重复的代码。

由外向内的开发模式有助于我们设计出良好的接口，先来看看controller

{% highlight ruby linenos %}
  class NotificationsController < ApplicationController
    # ...

    def update
      notification = current_person.find_notification_by_id(params[:id])

      if notification.update_attributes parse_params(params.slice(:unread))
        head :ok
      else
        head :unprocessable_entity
      end
    end

    private

    def current_person
      current_user || current_employee
    end

    # ...
  end
{% endhighlight %}

在`update`这个action中，我们需要通过`current_person`来获得相应的`notification`，而`current_person`可能是一个`current_user`或者是`current_employee`，也就是说我们必须在`User`和`Employee`中都分别来实现`find_notification_by_id`。这个方法要做的就是从属于`current_employee`或者`current_user`的通知中找出给定的id的一条通知。方法其实很简单，大概如下

{% highlight ruby %}
  notifications.where(id: id).first
{% endhighlight %}

### 测试

即便方法只有一行，但程序员是**以复制粘帖为耻的**。所以我觉得把它抽离到一个module中。测试先行：

{% highlight ruby %}
  # spec/lib/notification_shared_methods_spec.rb
  require 'spec_helper'

  describe NotificationSharedMethods do
    describe '#find_notification_by_id' do
      before :each do
        @employee = Factory :employee
        @notification = Factory(:notification, receiver: @employee, sender: Factory(:user))
        @employee.extend NotificationSharedMethods
      end

      it 'returns a notification when a record is found ' do
        @employee.find_notification_by_id(@notification.id).should eq @notification
      end

      it 'raises when no record found' do
        expect do
          @employee.find_notification_by_id(9999999)
        end.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end
{% endhighlight %}

通过以上的spec我们可以清楚的知道这个方法应该完成什么任务。注意，我们希望找不到`notification`时会抛出`ActiveRecord::RecordNotFound`，这样，当`notification`找不到时，rails会自动处理，给用户一个404。"Do it the rails way"嘛!

### 实现

{% highlight ruby %}
  # lib/notification_shared_methods.rb

  module NotificationSharedMethods
    def find_notification_by_id(id)
      n = notifications.where(id: id.to_i).first
      return n if n

      raise ActiveRecord::RecordNotFound
    end
  end
{% endhighlight %}

这里比较奇怪的是`notifications`是哪来的？注意到上文model中的`has_many`声明，当`NotificationSharedMethods`被`include`到对应的model之后，

{% highlight ruby %}
  current_user.find_notification_by_id(params[:id])
{% endhighlight %}

此时的`self`是`current_user`, 而`current_user`具有`notifications`方法。
这样的方法体可能让读者一时摸不着头脑，可以稍微重构一下

{% highlight ruby %}
    def find_notification_from(source, id)
      n = source.where(id: id.to_i).first
      # ...
    end
{% endhighlight %}

从某一个源中来查找通知，这样直接传入一个scope，语义似乎更加明确，不过调用时就需要传多一个参数

{% highlight ruby %}
  current_user.find_notification_from(current_user.notifications,
params[:id])
{% endhighlight %}
 
看起来比上文`controller`中展示的稍逊一筹，各有利弊，我偏向于第一种。

注意，这个module放在lib目录下，必须在启动rails时吧lib目录的文件加载进来，这样才能生效。

{% highlight ruby %}
  # config/application.rb
  config.autoload_paths += %W{#{config.root}/lib}
{% endhighlight %}

然后我们就可以中model中引入这个模块了。

{% highlight ruby %}
  class Employee < ActiveRecord::Base
    include NotificationSharedMethods
    # ...
  end
 
  class User < ActiveRecord::Base
    include NotificationSharedMethods
    # ...
  end
{% endhighlight %}

以后可能需要将通知发给一个部门，那么我们同样可以在`Department`中引入改模块，而不需要重复的定义相似的方法。

### Wait, wait, wait ...

为什么你要自找麻烦呢，何不

{% highlight ruby %}
  Notification.find(params[:id])
{% endhighlight %}

这样不就结了吗？！这种做法看似十分方便，实际上隐含了一些安全性问题。比如，任意一个登录用户，可以随便猜一个id，发个请求，一旦猜中，他就可以对别人的通知进行更新了！以上这种做法被@avdi比喻成'lone wolf'，想想，一只离群的狼是多么的脆弱和危险。

而在程序中，我们通过类似`has_many belongs_to`等，建立的对象树（层级结构），比如，一个作者有多篇文章，我们可以快速的从主干访问到枝叶`author.articles`，也可以从枝叶快速的访问到主干`article.author`。既符合我们对现实世界的理解，也有利于安全。例如，上文的例子中，`current_person`只能够访问到属于自己的`notifications`，而不能获得别人的。

再者，在controller中，已`current_user`为核心是一种最佳实践，他让我们更容易的理解目前在发生什么事情。比如，`current_person.find_notification_by_id`, 以OO的方式来解读，是发送`find_notification_by_id`这条消息给`current_person`。翻译成汉语是，“让当前用户通过id去查找（属于自己的 -- _隐含的_）通知”。而`Notification.find(params[:id])`则显得不这么OO，翻译成汉语是，“从数据库中检索出对应id的通知”。相形见绌！



[1]: http://en.wikipedia.org/wiki/Don't_repeat_yourself
