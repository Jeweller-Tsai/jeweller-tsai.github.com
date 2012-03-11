---
layout: post
title: ActiveModel Flavored Validations in Coffeescript
category: coffeescript
tags: coffeescript javascript validations activemodel
---
##我为什么喜欢Coffeescript

虽说Coffeescript仅仅是将JS做了包装，最终还是会被转换成JS，但是他可以大大提高生产效率！

**一门优秀的程序语言，会潜移默化的改变程序员的思维。**Ruby是我最喜欢的语言，我在写JS的过程中经常思考的一个问题就是，如果是用Ruby来写，我会怎么做。
JS（或者说jQuery,当然jQuery不代表JS）,支持面向对象，但是不会让你一上手就用面向对象的思维，在写前端的时候，
基本上一开始我都是用过程式方法来实现的。jQuery也没有帮我们做好文件的管理，一开始学习的时候，
我将所有的代码堆在一个文件里,这样同样能实现功能，但是惨不忍睹。而且导致效率非常低下，我自己写的代码，但经常找不到想要看的方法。:-(
而且，一旦前端需求变得复杂的，面向过程的可能很难应付了。
这时回过头来重构，你可能已经写了一大堆代码,有点积重难返了。CoffeeScript就不一样了。

CoffeeScript的语法应该是参考了Ruby和Python的吧，所以也相当简洁。(写这篇文章时，我发现_pygment_似乎不能高亮CoffeeScript，也许是我的版本太老，所以我用了pyton的格式来做高亮，效果还可以:-》)即便你一开没有面向对象，但到有需要时，
仍然可以轻松的转换过来。

以下将讲述如何实现CoffeeScript中的mixin,
还有怎么样写出ActiveModel风格的前端验证。初学JS，更别说CoffeeScript，有写的不对的地方，欢迎指正！
##CoffeeScript中的mixin

原生的CoffeeScript并没有提供mixin机制，但是当继承并不合适的时候，我总想起Ruby中的mixin。即便CoffeeScript中没有提供现成的机制，但是在CoffeeScript中还是可以方便的来实现mixin。

{% highlight python %}
  # 定义类方法`include`
  # 将被mixin的prototype中定义的方法iterate出来
  # 然后将每个方法赋给klass
  Object::include = (mixin, klass) ->
    klass.prototype[name] = method for name, method of mixin.prototype

  class A
    a: -> alert('in a')

  class B
    include A, this

  (new B).a()  #  in a
{% endhighlight %}

不过比Ruby的`include`多了一个参数，两行代码，还不赖吧。
如果觉得直接将`include`写在`Object`下不妥的话，可以先写在一个基类里面，然后在继承这个基类。

##ActiveModel风格的验证

利用`include`，正好可以用来mixin一个`Validator`。因为你会发现一个`customer`继承自`Validator`很奇怪。当然不一定要用mixin，以下是我一开始时的做法

{% highlight python %}
  class CustomerInfo
    validator: new Validator
  
  # 将一个Validator作为CustomerInfo的属性，然后就可以调用validator的方法
  # 例如：
  # @validator.validatesPresenceOf '#fieldId'
{% endhighlight %}

这样看起来还能接受，但是我还是比较喜欢Rails里面的验证模块那种风格。

{% highlight ruby %}
  validates :name, presence: ture
{% endhighlight %}

这样更加优雅，不是吗？
利用`include`, 可以做一个ActiveModel flavored的验证。做法很简单，就是可以写一个`Validator`类，然后将其mixin到需要做验证的类里面。 

{% highlight python %}
   # 由于运行环境是浏览器
   # 所以将include写在window下

   window.include = (mixin, klass) ->
     klass.prototype[name] = method for name, method of mixin.prototype
{% endhighlight %}

我们希望最终的效果是这样的：

{% highlight python %}
  class window.CustomerInfo
    # 将Validator mixin进来
    include Validator, this
   
    constructor: ->
      # 参数： 页面id，一个或多个
      # @validatesPresenceOf '#phone-num', '#last-name', '#district'

      # 或者
      @validates '#phone-num', '#last-name', '#district', presence: true
      @validates '#time', format: /\d{4}-\d{1,2}-\d{1,2}\s\d{2}:\d{2}(:\d{2})?/, presence: true
{% endhighlight %}

这样，当`new CustomerInfo`，就已经自动绑定好验证。

下面是Validator类的定义, 有点长:-o

{% highlight python linenos %}
  class window.Validator
    isBlank: (str) ->
    return false unless /^\s*$/.exec(str)?

    true

    isValidWith: (str, format) ->
      return true if format.exec(str)

      false

    fireAlarm: (jObject, msg) ->
      jObject.parent().parent().addClass('error')
      for obj in jObject.siblings('span')
        return if obj? && jQuery(obj).text() == msg

      jObject.after "<span class='help-inline'>" + msg + "</span>"

    stopAlarm: (jObject, msg) ->
      siblings = jObject.siblings('span')
      jQuery(obj).remove() for obj in siblings when jQuery(obj).text() == msg
      jObject.parent().parent().removeClass('error') if siblings.length == 0


    # CoffeeScript支持一数组作为参数
    # 这跟Ruby相似 如，def method (*args); end
    # 只不过是用`...`来表示
    validatesPresenceOf: (pageIds...) ->
      self = @
      for pageId in pageIds
        jField = jQuery(pageId)
        jField.blur ->
          jSelf = jQuery this
          if self.isBlank jSelf.attr('value')
            self.fireAlarm jSelf, '不能为空'
          else
            self.stopAlarm jSelf, '不能为空'
  
    validatesFormat: (pageId, format) ->
      jField = jQuery(pageId)
      self = @
      jField.blur ->
        jSelf = jQuery this
        if not self.isValidWith jSelf.attr('value'), format
          self.fireAlarm(jSelf, '时间格式错误')
        else
          self.stopAlarm(jSelf)
  
    validates: (fields...) ->
      opts = fields.pop()
      for k, v of opts
        opt = k.toString()
  
        if opt == 'presence' && v == true
          @validatesPresenceOf(fields...)
        else if opt == 'format'
          @validatesFormat(field, v) for field in fields
        else
          throw opt + ' is not allowed'
 
{% endhighlight %}

#更新

今天在想，Ruby里面的mixin是面向`module`的，可是无论是JS还是coffeescript，都没有`module`阿。上文我将`Validator`写成一个类，但是上文也说了以下这种做法没有mixin优雅。

{% highlight python %}
  class CustomerInfo
    validator: new Validator
{% endhighlight %}

**也就是说，`Validator`这个类应该不可能被实例化了，既然不可能被实例话，写成类是不是不合适呢？**

{% highlight python %}
  window.include = (mixin, klass) ->
    klass.prototype[name] = method for name, method of mixin.prototype
{% endhighlight %}

**这里将`mixin.prototype`中所有方法都迭代出来赋给`klass.prototype`，这样做似乎也欠妥！**因为`klass`的`prototype`和`mixin`的`prototype`应该有交集，也就是说他们有相同的方法，我们这样做不就违反了DRY吗？

基于以上两个理由，直接将`Validator`写成一个`Hash`(或者说一个`object`)，可能更妥当。

{% highlight python %}
  # 方法体同上，此处省略
  Validator = 
    validates: ->           
    validatesPresenceOf: -> 

 # 直接读出mixin对象中的方法
 window.include = (mixin, klass) ->
    klass.prototype[name] = method for name, method of mixin
{% endhighlight %}

以上的这种做法是不是更合适呢？ >_<


##总结

以OO的思维方式来写JS，可以提高代码的可读性，处理起复杂的逻辑更加得心应手。或许像这样的前端验证根本算的上复杂，但就我个人经验，如果是更加复杂的应用，优势会更加明显。

>    A: By the way, do you know a gem called client_side_validations ?

>    B: WTF ...
