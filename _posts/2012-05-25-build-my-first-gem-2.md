---
layout: post
title: Build My First Rubygem -- Part 2
category: ruby
tags: gem CLI 程序设计
---

[上一篇文章][1]简单介绍rubygem开发的一些基础和一些细节，本文则将侧重于Gmusic的设计和部分实现，以及一些遗留问题。

###Architecture

Gmusic是一个较为简单的程序，我并没有在一开始就做过多的设计，而是在开发的过程中逐步重构，边开发边设计的。也许有人不同意这样的开发方式，这有悖于传统的软件工程的开发流程。我实习工作的开发流程是，老大做好粗粒度总体架构，讨论具体需求，定好功能优先级，然后开始OOXX（BDD应该算是）。如何做开发，是我比较关心，但是作为一个新手，我在这方面没什么发言权，就不多说了。来看看Gmusic到目前为止的结构。

![Architecture][4]

由上图可以看出整体是CS架构，Gmusic可以看作是谷歌音乐的一个命令行客户端。Gmusic采用三层结构，分别由Service层、Model层和CLI层构成。Service层主要负责与谷歌音乐交互，分别由搜索和下载模块构成，包括发送请求，处理response，解析页面，抓取信息，下载、保存文件等一些基础工作。Model层由Song和Album两个model组成，封装了Service层，完成歌曲和专辑的搜索、下载逻辑。CLI层负责提供指令集和界面展示，依赖Model层。底层为上层提供服务，底层独立于上层，上层依赖于下层。这样设计的好处在于，耦合度低，灵活性高。

![Architecture][5]

Gmusic是一个简单的程序，即便不做什么设计，应该也能完成功能。设计的目的在于方便管理项目，在于优化程序，在于让程序更漂亮，基本上和我们对女人的要求相似。Service层作为基础设施，它的存在有其必然性。而Model层的出现，则为了屏蔽底层细节，提供领域相关的APIs，让调用者能够集中精力于业务逻辑，而不受底层实现的干扰。例如，在Gmusic中，谈及歌曲，你可能关心的就是歌曲的搜索，那么Song就提供了`search_by_title`这样的类方法(Model层APIs的设计，有在刻意的模仿ActiveRecord)。调用者不必去关心具体如何做搜索，而是只需调用语义明确的APIs即可。另外，Model的扩展也是十分方便的。例如，你要列出一个歌手最受欢迎的一部分歌曲，你可以建立一个Artist类，让它"has many" Songs。这样你就可以通过`artist.hot_songs`轻松达到目的。CLI层的命令集的实现借助于[thor][2]，界面展示利用了[command_line_reporter][3]。CLI层调用Model层的接口。在[上一篇文章][1]提到“Gmusic是沟通ruby程序于谷歌音乐的桥梁”，那么，此时的Gmusic是作为接口，而非命令行工具，直接调用Model层的APIs即可，CLI层没有存在的意义。幸好，Model层是独立于CLI层的，CLI层相当于一顶帽子，要用时戴上，不需要时可以脱下。

###Usage

作为一个命令行工具，Gmusic提供简单简单的指令集：

{% highlight bash %}
  gmusic --help

  Tasks:
    gmusic download     # Download songs or albums
    gmusic help [TASK]  # Describe available tasks or one specific task
    gmusic search       # Search songs or albums
{% endhighlight%}

Gmusic提供`search`和`download`两个指令：

{% highlight bash %}
  gmusic help search

  Usage:
    gmusic search

  Options:
    -t, [--title=TITLE]  
    -a, [--album]        

  Search songs or albums
{% endhighlight%}

可以用`gmusic s -t song-name`来搜索一首歌，用`gmusic s -a -t
album-name`来搜索专辑。

{% highlight bash %}
  gmusic help download

  Usage:
    gmusic download

  Options:
    -t, [--title=TITLE]          
    -a, [--album]                
    -d, [--directory=DIRECTORY]  

  Download songs or albums
{% endhighlight%}

如果你确定要下载某一首歌，可以不通过搜索，直接`gmusic d -t
song-name -d /path/to/your/folder`来下载一首歌

![Commands][6]

作为Ruby程序与谷歌音乐的接口，Gmusic提供简洁的APIs。

{% highlight ruby %}
  # Gemfile
  gem 'gmusic', '1.0.0'

  # app/models/song.rb
  class Song < ActiveRecord
    def self.search_by_title(title)
      raise 'Invalid title' if title.blank?

      @song ||= where('title LIKE ?', "%#{title}%")
      return @song if @song.present?

      @song = Gmusic::Song.search_by_title title
    end
  end
{% endhighlight %}

上面的例子展示如何使用Gmusic。思路是，如果本地数据库搜索不到目标歌曲，则调用Gmusic，搜索谷歌音乐。

看到这里，你可能觉得Gmusic没什么作用，现在越来越少人下载音乐，更何况用命令行下载？我表示自己电脑上没有存一首歌，除了测试Gmusic时下载的。至于作为接口，可能上面举的例子这种情况有一点点用吧。那为什么开发Gmusic呢？程序员都爱折腾嘛。Gmusic最初有towerhe开发，我写这个新版本纯粹是为了学习写gem，从这个角度讲，还是有达到目的拉。

##遗留问题

###1. 关于如何提高下载速度

一首歌大小是3～10M，如何提高下载速度呢？我一开始的思路是利用HTTP的Range头部，将一首歌拆成几部分，利用多线程并发下载。HTTP的keepalive可以减少建立链接的次数。原来是一次链接，一次请求。那么将一首歌分成两部分下载，则需要建立3次链接。第一次请求获得文件大小，二三次链接才是下载。建立链接是耗时的，“net/http”这个库支持keepalive，所以只需要建立一次链接。pipeline支持连续请求，即不需要等到服务器返回之后再发请求。听起来挺靠谱，我花了一些时间来尝试实现这个想法，结果当然没成功啦，要不然怎么会放在“遗留问题”这一节来讲呢？！除了pipeline不知道如何实现（[net-http-pipeline][7]还没尝试过），已经能将歌曲分段，利用多线程下载，结果是下载时间基本没差别，甚至更长一点:-( 我对多线程编程和HTTP都不是很熟悉，无法解释失败的原因。将原因归结于Ruby的绿色线程似乎不是很合适？为了减少篇幅，试验代码[这里][8]。

第一种方法失败后，我有尝试利用[em-http-request][9]来下载专辑。我在想，既然一首歌无法分段下载，但如果同时下载多首歌呢？[这段代码][10]在搜索专辑时是有效果的。当你搜索专辑时，会得到一个专辑列表，要获得每张专辑的歌曲列表，则必须每张专辑多发一个请求。比如，你搜索专辑《阿密特》，列出3个相关专辑，当你选中其中一张，然后再发送请求去获得这张专辑的歌曲，中间必须有个等待的过程。我的做法是，当完成专辑的搜索后，顺便获取每张专辑的歌曲列表，这样虽然获取了多余的列表，但是由于是并发的，所以时间还是差不多。但是用户不用在选择了某张专辑后又等一段时间才有结果，用户体验稍微提升了一点。但是[这段代码][10]用于下载却没有效果，比直接下载耗时更长一点:-(

###2. 关于如何编写下载进度条

在我的设计中，下载在Service层，而展示在CLI层。但是看过[别人所的写的][11]，都是紧耦合的，如何解偶呢？而是在[这段代码][11]中是每隔一段时间停下来打印进度，有没有更好的方法呢？

[1]: /ruby/2012/05/24/build-my-first-gem-1/
[2]: https://github.com/wycats/thor
[3]: https://github.com/wbailey/command_line_reporter
[4]: /public/images/2012-05-25-1.png
[5]: /public/images/2012-05-25-2.png "The Architecture of Gmusic"
[6]: /public/images/2012-05-25-3.png "Command shortcuts"
[7]: https://github.com/drbrain/net-http-pipeline
[8]: https://gist.github.com/2794445
[9]: https://github.com/igrigorik/em-http-request
[10]: https://gist.github.com/2794500
[11]: https://gist.github.com/454926
