---
layout: post
title: 利用jekyll建博客----创建
category: others
---
这是我的第一个个人博客，做的比较粗糙，还有许多地方是“重用"别人的，见笑了。下面将介绍我如何利用jekyll来搭建这个博客。

[jekyll](https://github.com/mojombo/jekyll/ "gitbub上的主页")是一个用ruby开发blog-aware，可以用来生成静态网页。这个在
ruby社区用的比较多，感觉比较方便。大家可以先看看一些用**jekyll**搭建的[博客](https://github.com/mojombo/jekyll/wiki/sites "这里有许多优秀的博客")。

####1 [安装jekyll](https://github.com/mojombo/jekyll/wiki/install)

    gem install jekyll
    sudo apt-get install python-pygments

第一条指令会安装所依赖的directory_watcher, liquid, open4, maruku classifier 4个gem
第二条会安装pygments，pygments能够显示近百中代码的格式，提供许多很酷的配色方案，我想这是程序员的最爱。

####2 基本的文件框架

    |-- _config.yml                    ---存储一些配置数据
    |-- _layouts                       ---基本页面框架
    |   |-- default.html               ---整个网站的layout
    |   `-- post.html                  ---文章的template
    |-- _posts                         ---所有的文章都放在这，**请看命名格式**
    |   |-- 2011-7-12-title1.markdown
    |   `-- year-month-day-title2.markown
    |-- _site                          ---jekyll自动生成的静态页面，部署时只需要吧这个文件夹放到服务器上
    `-- index.htm                      ---网站主页

至于其他文件夹，可以根据自己需要去添加。在我的项目中就有css，javascript等

####3 运行jekyll

    jekyll --server --auto

这条这里启动服务器，访问**http://localhost:4000** 可以看到自己网页。

这样就已经基本完成了整个博客的搭建了，看起来似乎很简单。部署的话留到下一篇[利用jekyll建博客----部署到heroku](#)

####4 一些细节

>    1 layouts是基于[YAML front matter](https://github.com/mojombo/jekyll/wiki/YAML-Front-Matter "YAML")定义的，要了解一下。另外，layouts里面用的是liquid tag写的，用\{ content \}这样的语法来插入数据，很简洁。

>    2 [\_config.yml](https://github.com/mojombo/jekyll/wiki/configuration "配置文件")需要看一下。

>    3 posts支持textile和markdown，我用的是markdown，因为textile似乎不支持中文，但我请教过别人，说是能支持！_! 可以看看[markdown](http://daringfireball.net/projects/markdown/syntax "pretty cool")的语法。

>    4 [pygments](http://pygments.org/demo/ "可以用自己的代码来体验一下")提供许多配色方案，选一个自己喜欢的方案。

    pygmentize -f html -S default > pygments.css

这条指令生成css文件（可以将default换成native或其他配色方案），再引用到你的网页中，这样就能高亮代码了。

*   例如

{% highlight ruby linenos %}
def greet
  puts hello world
end
{% endhighlight %}

基本过程就是这样，流程是比较简单的，如果有良好的web开发经验的话，应该能够十分快速的开发出一个很好的博客。可惜我水平太烂，以后在慢慢优化吧。

先介绍到这里，请轻拍。

