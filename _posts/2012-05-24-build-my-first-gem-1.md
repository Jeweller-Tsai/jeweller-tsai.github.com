---
layout: post
title: Build My First Rubygem -- Part 1
category: ruby
tags: gem CLI
---

###前言

本文将简要介绍了Gmsuic和gem开发相关知识和注意事项及部分测试内容。本文所并非要教你如何从无到有的写一个gem，而是分享Gmusic开发过程中的一些注意事项和一点心得。

出于学习如何开发一个rubygem的目的，我接受@towerhe的建议，为[Gmusic][1]开发一个新的版本。看一眼自己commits，第一次已经是3个月以前，由于之前一直在工作，后来又回到学校写论文（我不厚道的把[Gmusic][2]作为我的毕业设计了:->），有时间就断断续续的写，实际的开发周期远远没有这么长。今天稍微空下来，就做一下总结吧。

用来帮助开发gem的工具应该有许多，我选择的[bundler][3]。bundler不仅仅是一个gem依赖的管理工具，它也可以用来辅助gem的开发，而且相当方便。[这里][4]有一段教学视频，初学者不妨看一看。

###What's Gmusic for

Gmusic是Google Music的缩写。Gmusic有两个功能：

* 作为一个命令行工具，用来从谷歌音乐搜索和下载歌曲。
* 作为API，是沟通ruby程序和谷歌音乐的桥梁。

这里是我做毕业答辩是做的PPT，可以帮助对Gmusic有个直观的认识。

<div class="prezi-player"><style type="text/css"
media="screen">.prezi-player { width: 820px; } .prezi-player-links {
text-align: center; }</style><object id="prezi_iao3q6krwky1"
name="prezi_iao3q6krwky1"
classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="820"
height="415"><param name="movie"
value="http://prezi.com/bin/preziloader.swf"/><param
name="allowfullscreen" value="true"/><param name="allowscriptaccess"
value="always"/><param name="bgcolor" value="#ffffff"/><param
name="flashvars"
value="prezi_id=iao3q6krwky1&amp;lock_to_path=0&amp;color=ffffff&amp;autoplay=no&amp;autohide_ctrls=0"/><embed
id="preziEmbed_iao3q6krwky1" name="preziEmbed_iao3q6krwky1"
src="http://prezi.com/bin/preziloader.swf"
type="application/x-shockwave-flash" allowfullscreen="true"
allowscriptaccess="always" width="820" height="415" bgcolor="#ffffff"
flashvars="prezi_id=iao3q6krwky1&amp;lock_to_path=0&amp;color=ffffff&amp;autoplay=no&amp;autohide_ctrls=0"></embed></object><div
class="prezi-player-links"><p><a title="Gmusic"
href="http://prezi.com/iao3q6krwky1/gmusic/">Gmusic</a> on <a
href="http://prezi.com">Prezi</a></p></div></div>

###Getting started

首先利用bundler来建立项目骨架，此时bundler会自动实例化一个Git仓库。

{% highlight bash %}
  bundle gem gmusic
{% endhighlight %}

执行上面指令会生成下列文件：

{% highlight bash %}
  ├── Gemfile
  ├── gmusic.gemspec
  ├── lib
  │   ├── gmusic
  │   │   └── version.rb
  │   └── gmusic.rb
  ├── LICENSE
  ├── Rakefile
  └── README.md
{% endhighlight %}

简要介绍这几个文件的作用。

* *gmusic.gemspec*:
  这个文件包含了对该gem的描述和该gem的依赖（包括runtime和development）
* *Gemfile*: 写过Rails项目的都很熟悉，用来添加项目的依赖。那么这个文件和gemspec的区别在哪呢？一个gem必要的的依赖必须写在gemspec下。例如Gmusic运行时依赖于Mechanize，测试时依赖于rspec，没有Mechanize这项目不能正常运行，没有了rspec这测试脚本无法运行，所以必须写在gemspec下。安装是runtime的依赖会被自动安装，当执行`gem install gmusic --dev`时，开发依赖也会被安装，这方便别人参与你的项目。然而，Gmusic还同时使用了pry来帮助debug，pry则不是Gmusic的必要依赖，所以我可以写在Gemfile下。
* *lib/gmusic.rb*:
  这个文件里面定义了一个叫`Gmusic`的module，是项目的命名空间。这个文件可以看作是程序的入口，当加载这个gem时，这个文件会被require。
* *lib/gmusic文件夹*：我们并不希望将所有的代码统统堆在lib/gmusic.rb文件下，这样不利于管理。必要时，你可以在这个文件夹下添加任意的文件或文件夹。

###Test your gem

创建一个gem的主要目的之一在于重用，可靠性则尤为重要，所以测试是必须的。BDD是我在实习过程中接触的，渐渐成为习惯，脱离测试的代码很危险。以下是Gmusic采用的开发依赖：

{% highlight ruby %}
  s.add_development_dependency "rspec", "~>2.8.0"
  s.add_development_dependency "cucumber", "~>1.1.4"
  s.add_development_dependency "aruba", "0.4.11"
  s.add_development_dependency "fakeweb", "1.3.0"
{% endhighlight %}

因为Gmusic提供CLI，所以利用[aruba][5]（aruba是cucumber的扩展，方便于命令行程序的测试）来帮助测试。利用aruba的一个好处是，可以在开发过程中方便的知道指令是否写对，而非通过安装后测试。实际上aruba就是为我们提供`When I run command`这样一些语句,你可以在[这里][6]看到更多。如果你想用中文来写这些feature，也可以直接调用aruba的方法。另外，有些指令执行的时间可以比较长，可以通过`@aruba_timeout_seconds`来设置超期时间。下面是利用aruba写出来的一段测试代码。

{% highlight ruby %}
 Feature: Searching music
   In order to search songs 
   As a CLI                 
   I want to be as objective as possible
 
   @announce-cmd            
   Scenario: search songs   
     When I run `gmusic search --song xxx`
     Then the output should contain "searching..." 
{% endhighlight %}

在此之前必须为Gmusic创建一个可执行文件。

{% highlight bash %}
  $ cat bin/gmusic

    #!/usr/bin/env ruby
    require 'gmusic/cli/cli'

    Gmusic::CLI.start   # Gmusic的CLI是利用thor写的
{% endhighlight %}

然后执行`chmod a+x bin/gmusic`改变该文件的模式。

除了命令行的测试，另外要提的一点是联网部分的测试。由于Gmusic要与谷歌音乐进行交互，连网是必须的。那为了提高测试速度，我们利用[fakeweb][7]来帮助测试。例如，要测试网页信息的抓取，我们可以先将目标网页下载到本地，当请求该目标地址时，直接让fakeweb返回这个网页的文件流即可，这样大大加快了测试速度。以下是Gmusic测试用的的helper。

{% highlight ruby %}
  require 'fakeweb'

  # 我将下载下来的测试网页默认放到了spec/web_pages文件夹
  def path_to(filename)
    File.join(File.dirname(__FILE__), '..', 'web_pages', filename)
  end

  # 当请求某个url时，返回文件名为filename的文件
  def prepare_fake_web(filename, url)
    stream = File.read(path_to(filename))
    FakeWeb.register_uri(:get, url, :body => stream, :content_type => "text/html")
  end
{% endhighlight %}

###Loading code

要了解rubygem的代码是如何被加载的，可以读一读[这一小节][8]。

在开发gem时，如何做到正确引入依赖，而且不重复引入呢？我采取的基本策略是内部依赖（自己写的不同文件）用autoload，外部依赖（第三方gem，库）用require。由于Gmusic采用金字塔型的架构（[下一篇][9]会具体介绍），外部依赖基本出现在底层，内部依赖则出现在上层。例如，底层的Search模块需要用到Mechanize，我就直接用require。每次执行require时都会重新加载该文件。autoload则是惰性加载，用autoload绑定一个模块（String或者Symble）与一个文件，当这个模块第一次被用到时，ruby才加载对应文件，而再次被调用时，不会重复加载。那么内部依赖使用autoload，可以确保在执行时才加载，只加载要用到的，而且不会重复加载。例如，Gmusic这个顶层命名空间下，autoload Search这个模块，当我只执行下载指令时，Search模块不会被加载。当执行搜索指令时，Search模块会被加载，那么Mechanize也会被加载，之后再调用Search模块时，Search模块不会被再次加载，自然，Mechanzie也就不会被重复加载。

###Summary

关于如何开发一个gem，[Rubygems
Guides][10]是很好的学习资料。也可以观看[这个视频][4],教你如何利用bundler来构建一个gem。另外还可以看看[这篇文章][11]。

[下一篇][9]文章会分析Gmusic的设计以及部分具体实现。

[1]: https://github.com/towerhe/gmusic
[2]: https://github.com/towerhe/gmusic/tree/develop
[3]: http://gembundler.com/
[4]: http://railscasts.com/episodes/245-new-gem-with-bundler
[5]: https://github.com/cucumber/aruba
[6]: https://github.com/cucumber/aruba/blob/master/lib/aruba/cucumber.rb
[7]: https://github.com/chrisk/fakeweb
[8]: http://guides.rubygems.org/patterns/#loading-code
[9]: /ruby/2012/05/25/build-my-first-gem-2/
[10]: http://guides.rubygems.org/
[11]: https://github.com/radar/guides/blob/master/gem-development.md
