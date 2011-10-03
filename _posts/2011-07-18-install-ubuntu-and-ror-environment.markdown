---
layout: post
title: 安装Ubuntu10.04和配置RoR开发环境
category: linux
---

上班第一天，配置环境。

要求：安装Ubuntu-10.04 \+ RVM \+ Ruby1.9.2 \+ Git-Flow

#### 1 首先安装 Ubuntu-10.04LTS ####

先在[Ubuntu官网](http://www.ubuntu.com/download/ubuntu/download "http://www.ubuntu.com/download/ubuntu/download")下载ios镜像，然后将其burn到cd中，最后设置开机读取光驱。（重启，按F11)

+ 根路径分配50G（/）
+ 交换分区分配4G（注：一般为内存2倍）
+ 其余分配给home（/home)

之后等待自动安装，可以去吃饭去。:) 接下来安装RVM

#### 2 安装RVM ####

访问其[官网](https://rvm.beginrescueend.com/ "https://rvm.beginrescueend.com/"),有详细的教程。RVM有两种安装模式：Single-User和Mutil-User,我们选择Single-User模式。开始[安装](https://rvm.beginrescueend.com/rvm/install/ "可以到这里看详细安装教程")：

2.1 安装最新版本的RVM

    curl -s https://rvm.beginrescueend.com/install/rvm -o rvm-installer ; chmod +x rvm-installer ; ./rvm-installer --version latest

2.2 把RVM作为函数装载到shell会话中

    user$ echo '[[ -s "$HOME/.rvm/scripts/rvm" ]] && . "$HOME/.rvm/scripts/rvm" # Load RVM function' >> ~/.bash_profile

2.3 重载shell配置并测试

    source .bash_profile
    user$ type rvm | head -1

    如果安装和配置都正确的话，会看到`rvm is a function`

2.4 现在可以看看RVM给我们带来什么benefit！（如果你曾经在linux安装过ruby1.9.2的话，那种蛋疼只有自己试过才知道！）

+ 2.4.1 在shell中输入`rvm list known`，能够列出ruby的所有版本

>  ![rvm list known](/images/article-images/rvm-list-known.png "list of ruby versions")

+ 2.4.2 安装ruby 1.9.2

    rvm install 1.9.2

+ 2.4.3 使用ruby 1.9.2 并将其设置为默认

    rvm use 1.9.2 --default

+ 2.4.4 用`ruby -v`测试一下是否安装正确，能看到类似如下：

    ruby 1.9.2p180 (2011-02-18 revision 30909) [i386-darwin9.8.0]

+ 2.4.5 用`rvm notes`看看系统所需要的依赖，会看到如下

    # For Ruby (MRI & ree)  you should install the following OS dependencies:ruby: /usr/bin/apt-get install build-essential bison openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-0 libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev

只要copy然后安装这些依赖，如果没有安装可能导致一些意外。我一开始也没有安装这些依赖，结果不能安装rails。（注：安装了之后要`rvm install 1.9.2`将ruby重新安装一次才能生效。）


#### 3 安装gitflow ####

首先要安装git，利用`sudo apt-get install git` 一句话搞定。

接下来开始安装[gitflow](https://github.com/nvie/gitflow "https://github.com/nvie/gitflow")

在linux下，可以利用Rick Osborne的git-flow installer来安装，相当方便。

    wget --no-check-certificate -q -O - https://github.com/nvie/gitflow/raw/develop/contrib/gitflow-installer.sh | sudo bash

OK了，接下来就是要熟悉git-flow了，等下次再写写。

#### 4 安装rails ####

首先要安装 rubygems1.9.1

    sudo apt-get install rubygems1.9.1

接下安装rails

    sudo gem install rails 3.0.9

#### 5 安装janus ####

“shame on you， if you don‘t know vim" --看到这句话时，我决心学习使用vim :) 如果你有看到高手是如何使用vim的话，一定会惊叹不已。

+ 5.1 安装vim-gnome

    apt-get install vim-gnome

注：这默认会安装 commend-T 这个在ubuntu下可能会导致缩进不正常

    cd ~/.vim

将以下代码注释掉，再执行`apt-get install vim-gnome`

{% highlight ruby linenos %}
vim_plugin_task "command_t",        "http://s3.wincent.com/command-t/releases/command-t-1.2.1.vba" do
  Dir.chdir "ruby/command-t" do
    if File.exists?("/usr/bin/ruby1.8") # prefer 1.8 on *.deb systems
      sh "/usr/bin/ruby1.8 extconf.rb"
    elsif File.exists?("/usr/bin/ruby") # prefer system rubies
      sh "/usr/bin/ruby extconf.rb"
    elsif `rvm > /dev/null 2>&1` && $?.exitstatus == 0
      sh "rvm system ruby extconf.rb"
    end
    sh "make clean && make"
  end
end
{% endhighlight %}

+ 5.2 安装[janus](https://github.com/carlhuda/janus "https://github.com/carlhuda/janus")

    curl https://raw.github.com/carlhuda/janus/master/bootstrap.sh -o - | sh

安装完之后就要好好花时间去熟悉vim这个利器了。

就写到这吧，第一天over了！

