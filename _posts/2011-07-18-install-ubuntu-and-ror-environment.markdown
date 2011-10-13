---
layout: post
title: 安装Ubuntu10.04和配置RoR开发环境
category: linux
---

本文将介绍如何安装和配置：Ubuntu-10.04 \+ RVM \+ Ruby1.9.2 \+ Git \+ Git-Flow

#### 1 首先安装 Ubuntu-10.04LTS ####

先在[Ubuntu官网](http://www.ubuntu.com/download/ubuntu/download "http://www.ubuntu.com/download/ubuntu/download")下载ios镜像，然后将其burn到cd中，最后设置开机读取光驱。（重启，按F11)

+ 根路径分配50G（/）
+ 交换分区分配4G（注：一般为内存2倍）
+ 其余分配给home（/home)

#### 2 安装RVM ####

[rvm](https://rvm.beginrescueend.com/
"https://rvm.beginrescueend.com/")作为ruby版本管理工具，在ruby社区被广泛使用。例如，你有两个项目，一个用到ruby1.8.7,另外一个用到ruby1.9.2，同时，这两个项目分别有依赖与不同的gem，如果没有像rvm这样的版本管理工具，你很难对这两个项目同时进行开发与维护。另外，利用rvm来安装ruby也相当简单。

访问其[官网](https://rvm.beginrescueend.com/ "https://rvm.beginrescueend.com/"),有详细的教程。RVM有两种安装模式：Single-User和Mutil-User,我们选择Single-User模式。开始[安装](https://rvm.beginrescueend.com/rvm/install/ "可以到这里看详细安装教程")：

2.1 安装最新版本的RVM

    curl -s https://rvm.beginrescueend.com/install/rvm -o rvm-installer ; chmod +x rvm-installer ; ./rvm-installer --version latest

2.2 把RVM作为功能加载到shell会话中

    user$ echo '[[ -s "$HOME/.rvm/scripts/rvm" ]] && . "$HOME/.rvm/scripts/rvm" # Load RVM function' >> ~/.bash_profile

2.3 重载shell配置并测试

    source .bash_profile
    user$ type rvm | head -1

  如果安装和配置都正确的话，会看到`rvm is a function`

2.4 用`rvm notes`查看安装ruby所需依赖，并将其安装

    sudo /usr/bin/apt-get install build-essential bison openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-0 libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev

2.5 安装ruby

    rvm install 1.9.2 1.8.7    安装1.9.2和1.8.7（janus依赖与1.8.7）
    rvm use 1.9.2 --default    这里讲1.9.2设置为默认版本
    ruby -v
  用`ruby -v`查看是否安装正确


#### 3 安装git和gitflow ####

[git](http://git-scm.com/,
"http://git-scm.com/")是一个免费的开源的版本控制系统，与svn类似。

[gitflow](https://github.com/nvie/gitflow "https://github.com/nvie/gitflow")可以帮助我们更好的管理分支，这无论是在个人开发或者是团队开发都是很有用的！更多了解，请看[这里](http://nvie.com/posts/a-successful-git-branching-model/)

3.1 安装git

    sudo apt-get install git-core git-gui git-doc

3.2 安装gitflow

在linux下，可以利用Rick Osborne的git-flow installer来安装，相当方便。

    wget --no-check-certificate -q -O - https://github.com/nvie/gitflow/raw/develop/contrib/gitflow-installer.sh | sudo bash


#### 4 安装rails ####

4.1 安装 rubygems1.9.1

    apt-get install rubygems1.9.1

4.2 安装rails

    gem install rails 3.0.9

另外，可以安装`bundler`, 这个可以方便的安装gem

    gem install bundler

#### 5 安装janus ####

“shame on you， if you don‘t know vim" :-)

做RoR开发，很少人使用笨重的IDE，比较强大的编辑器有vim，emacs和textmate。[这里](http://yannesposito.com/Scratch/en/blog/Learn-Vim-Progressively/)有一篇很好的学习vim的教程，希望有所帮助。

5.1 安装vim-gnomle和exuberant-ctags

    apt-get install vim-gnome exuberant-ctags

5.2 安装[janus](https://github.com/carlhuda/janus "https://github.com/carlhuda/janus")

    rvm use 1.8.7     janus依赖于1.8.7，所以要先启用
    curl https://raw.github.com/carlhuda/janus/master/bootstrap.sh -o - | sh


## 总结 ##

配置开发环境是开始学习ruby on
rails的第一件重要的事情，我最初尝试在ubuntu上配置开发环境时浪费了许多时间，希望这篇文章能有所帮助。同时，如果文中有什么错误或者有什么问题，欢迎讨论！
