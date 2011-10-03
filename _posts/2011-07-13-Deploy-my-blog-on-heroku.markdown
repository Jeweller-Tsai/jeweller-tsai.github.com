---
layout: post
title: 利用jekyll建博客----部署
category: ruby on rails
---

通过上一篇文章[利用jekyll建博客----创建](),我们已经知道如何利用jekyll轻松搭建自己的博客，那么接下了就是部署了。jekyll提供了许多的[部署方案](https://github.com/mojombo/jekyll/wiki/Deployment "https://github.com/mojombo/jekyll/wiki/Deployment"),而我选择将其部署到[Heroku](http://www.heroku.com/ "http://www.heroku.com/")上，因为可以免费! 当然，实际上Heroku并不是完全免费，因为我这个博客完全是静态网页，没有用到数据库。有兴趣可以看下Heroku是如何[pricing](http://www.heroku.com/pricing#0-0 "http://www.heroku.com/pricing#0-0")的。

接下来是如何部署到heroku,将会用到[rack-jekyll](https://github.com/bry4n/rack-jekyll "https://github.com/bry4n/rack-jekyll")

####1 首先，要安装heroku这个gem####

     gem install heroku

####2 在项目的根目录下创建congig.ru 文件####

{% highlight ruby linenos %}
 require "rack/jekyll"
 run Rack::Jekyll
{% endhighlight %}

####3 把rack-jekyll这个gem加到heroku的清单中####

     echo "rack-jekyll" > .gems

####4 创建一个git仓库，并提交####

     git init && git add .
     git commit -m "jeweller's blog"

####5 创建一个heroku app####

     heroku create

####6 将刚刚提交到git上的项目push到heroku####

     git push heroku

####7 然后就可以访问你的主页了####

     heroku open

这样就已经部署完成，你有了自己的一个云应用了:) pretty
cool！现在app已经托管到heroku。如果想要修改或者发布新的博文的话,比如，以发布一片新的博文为例：

####8 到自己项目的根目录的\_post####
     文件夹中，新建文件。比如2011-07-13-titile.markdown

####9 然后开启服务器，看看效果。####

     jekyll --server --auto

####10 没问题的话就可以发布了。####

     git add .
     git commit -m "my first article"
     git push heroku

####11 去主页看看####

     heroku open

####12 可以给自己的app 重新命名####

     $: heroku rename jeweller
     http://jeweller.heroku.com/ | git@heroku.com:jeweller.git
     Git remote heroku updated

以后就可以用 [http://jeweller.herku.com/]() 来访问了。

Heroku确实是一个很棒的产品，将项目部署到上面，不用担心数据库，也不用担心服务器，只需要根据自己项目的需要**付钱**。另外，早上看到新闻，[Matz已经加入heroku了](http://blog.heroku.com/archives/2011/7/12/matz_joins_heroku/)。非常期待ruby能够在云应用领域大展身手。

