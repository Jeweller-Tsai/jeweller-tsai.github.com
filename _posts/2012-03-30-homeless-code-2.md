---
layout: post
title: 无家可归的代码（2）
category: RubyOnRails
tags: DCI DecoratorPattern 程序设计 
---

###“我无家可归！”

[无家可归的代码（1）][1]的例子应该是大家经常遇到的问题，也都是小问题。还有更纠结的！有没有这样一种情况：问题牵扯到好几个model的协同交互？这个时候怎么办？

>    “照样Fat model咯！再不行就只能委屈controller咯！问题太复杂了，就是这样！”

>    "你知道什么叫Single Responsibility Principle吗？"

>    "你的controller应该喝减肥茶了，不，是泻药！"

>    “……”

这下完了，model太胖，controller太胖，肿么办？这是你最怕的指令是`git
commit -m "it
sucks"`。太悲剧，Git把什么都记录下来，上面写着你那碉堡的英文名，还有那些不堪入目的代码。寝食难安！

###给你的代码找个归宿

[DCI][1]是最近Rails社区较为火热的议题，DCI强调数据与行为的完全分离，“一步一景”，根据上下文的切换，动态的注入角色，在此基础上产生交互。这对解决多角色的复杂系统确实是一个非常出色的想法！

举个例子，一个user，他可以能是一个customer，一个emplyoee，一个admin……他的角色可以有很多，但user还是那个user。现在我们常用的模式是，在User中加入role字段，用来判断他的身份。缺点是，一个`@user`非常的臃肿！这个User好像游牧民族一样，总是把自己的全部家当都带在身上。他不懂的夏天出行只需要带几件短袖，冬天出行则需要带羽绒，他的行李箱里面什么都有！实际上，当user是一个customer时，他只需要购买产品的能力，他不需要具备Admin的权限！如果需求简单，添加role这种做法还是足以解决问题，而且挺方便。如果问题一旦变复杂，则非常尴尬。比如，你有一个电子商务网站，游客只能浏览商品，只有注册用户才能购买。有一天老板突然对你说要支持电话订购。现在customer不在了，换成operator来接电话。她要在创建订单的同时创建一个user，否则账单不知道是谁的了。但问题是此时你仅有一个手机号码，其他用户需要的基本信息，如email通通都没有，而你的model上又做了大量的Validations。不过还是有办法，创建一个临时用户的模型，不强制订单跟User关联……总之你会有办法的，因为你是程序员！只是你的系统在畸形成长，你每天都在对自己说我再也不想碰他了，但你还是得天天面对。造成这种后够的原因有许多，作为一个程序员，该负的责任不大，但承受的痛苦近乎100%！

所以，当我第一次看到社区里有人在尝试DCI时，我以为我看到了光明。但似乎到现在还没出来个最佳实践:-(

###第一次尝试

DCI和Decorator有点相似，我决定利用[draper][3]来尝试做动态的角色注入。这里不再谈论纯粹的模式了，[draper][3]设计的初衷是用来写面向对象的helper，做model的展示，DCI也不是像我即将展示的做法那样子的，我只是在尝试解决实际的问题。不妥之处请指出。

现在，我的系统突然要支持拍卖了，它本来只是一个普通的电子商务网站。实际上，拍卖部分可以独立的成为一个子系统，但是我们没有这么做，原因不详。说白了，今天可以做拍卖，明天就有可能做团购。所以我决定不再直接的将功能加核心类中，以免太过臃肿。遵循单一责任原则。

首先，创建拍卖参与者角色（买家）。`bidder`本身是一个`user`，

*  如果条件允许，他就可以出价；
*  出价时要创建拍卖记录;
*  同时冻结保证金;

`AuctionsController`是`bidder`与系统交互的场所，切合DCI中的context。我提供了一个`bid`action。在这个action里，要完成以上3件事。

问题来了。"skinny
controller"!先要在一个action里面解决这3件事，而且还要保证事务的原子性（创建拍卖记录或者是冻结保证金失败都必须回滚，给出提示）。领域逻辑不适合写在controller里，而同时又不想把逻辑直接的写在model里，这就是为什么文章的题目叫“无家可归的代码”。

其实一个用户，他在其他任何时候都不是一个`bidder`，只有他出价时才是。所以我只要在他出价时给他赋予这个角色应该具有的功能就能解决问题。这样既保证了核心类的责任单一，也提高了课扩展性。以下是`BidderDecorator`的实现：

{% highlight ruby linenos %}
  class BidderDecorator < ApplicationDecorator
    decorates :user

    def bid_if_allow(opts, &block)
      return if newbie?

      money = opts[:price].to_f
      auction = Auction.find opts[:id]
      return if money <= auction.latest_price

      begin
        AuctionRecord.transaction do
          # NOTE: execution order maters! because the blcok never gonna raise,
          # so acount freezing must after the block
          ar = block.call(self, { auction: auction, price: money })
          account.freeze! frozen_amount(money)

          ar
        end
      rescue
        return
      end
    end

    def newbie?
      # TODO: redifine rules
      return false if user.auction_records.present?

      true
    end

    private
    def frozen_amount(money)
      amount = money * 0.1

      amount > 5 ? amount : 5
    end
  end
{% endhighlight %}

上面代码中`newbie?`用来判断用户是否是第一次参与拍卖（留了个TODO，因为规则定义有问题）。这个方法就会被页面调用，如果是首次参与用户，会要求其填写个人信息，JS处理。在`bid_if_allow`中调用，是为确保安全，避免非法用户绕开JS。第二个判断是判断用户出价是否高过当前价格，这部分也会用JS处理，同样是出于安全考量。接下来部分用一个`transaction`包裹，确保原子性。这里用`AuctionRecord.transaction`(AuctionRecord是拍卖记录)，是因为`block`将会创建一条拍卖记录，当资金冻结失败时会回滚。资金冻结也是一个transaction，<s>(注：实际上ActiveRecord不支持多model的transaction。但以上做法已经能满足我们的需求)</s>(**更正：应该是不支持分布式的数据库链接。Rails的transaction是基于数据库链接(per-database connection)，而非基于model(per model)。解释看[这里][4])**用了`freeze!`与`freeze`相对，区别是会抛错。外面用`begin rescue`包裹，捕捉到后返回`nil`。如果正常执行，`bid_if_allow`最终返回一条拍卖记录，失败则返回nil。

关于为什么需要用到`block`和`NOTE`注释，会在调用是再做说明。测试太长，仅截取关键部分：

{% highlight ruby linenos %}
  # spec/decorators/bidder_decorator_spec.rb

  context 'when the given block raises' do
    it "should not freeze bidder's acount" do
      original_amount = bidder.account.amount

      # 必须rescue之后才能断言
      begin
        bidder.bid_if_allow(opts) { raise }
      rescue
        bidder.account.amount.should == original_amount
      end
    end
  end

  context 'when freezing account raises' do
    before { bidder.account.should_receive(:freeze!).and_raise('error') }

    subject do
      bidder.bid_if_allow(opts) { AuctionRecord.create(auction_id: 1, user_id:1, price: 1) }
    end

    it 'execution in the block should be rollback' do
      # 断言已回滚
      expect { subject }.to change(AuctionRecord, :count).by(0)
    end

    it { should be_false }
  end
{% endhighlight %}

有了这个方法之后我们可以来写controller了，先看测试：

{% highlight ruby linenos %}
  # spec/controllers/auctions_controller_spec.rb
  describe 'PUT bid' do
    before :each do
      sign_in Factory(:user)

      # 需要进行decorate之后才能测试
      @bidder = BidderDecorator.decorate controller.current_user
      BidderDecorator.should_receive(:decorate).and_return(@bidder)
    end

    context 'when forbidden' do
      before :each do
        @bidder.should_receive(:bid_if_allow).and_return(nil)
        put :bid, format: :json
      end

      it { should respond_with :forbidden }
    end

    context "when allowed" do
      context "but faild" do
        before :each do
          @bidder.should_receive(:bid_if_allow).and_yield(@bidder, {})
          put :bid, format: :json
        end

        it { should respond_with :unprocessable_entity }
      end

      context 'and succeeded' do
        before :each do
          auction_record = mock_model 'AuctionRecord'
          # 这里要stub(:as_api_response)因为我的项目中用了acts_as_api
          # 如果你直接render一个对象，要stub(:as_json)
          auction_record.stub(:as_api_response) do
            {email: 'abc@expample.com', price: '12.00', created_at: Time.now }
          end
          @bidder.should_receive(:bid_if_allow).and_return(auction_record)

          put :bid, format: :json
        end

        it { should respond_with :created }
        it { should respond_with_content_type /json/ }
      end
    end
  end
{% endhighlight %}

当我们把业务逻辑从controller中抽离出来之后，你会发现controller的测试变得非常简单。你只需要断言`bid_if_allow`在成功或失败的应该返回的头部即可。

看完测试应该基本能明白controller改怎么写了。

{% highlight ruby linenos %}
  # app/controllers/auctions_cotroller.rb

  def bid
    bidder = BidderDecorator.decorate(current_user)

    ar = bidder.bid_if_allow(params) do |user, opts|
      auction_record = user.auction_records.build(opts)
      head :unprocessable_entity and return unless auction_record.save

      auction_record
    end

    head :forbidden and return unless ar

    respond_to do |format|
      format.json { render_for_api :default, json: ar, status: :created }
    end
  end
{% endhighlight %}

这是最终效果了。直到这个场景下，我们才为`current_user`注入`bidder`角色，他才具有参与拍卖的权利。说说`bid_if_allow`这个方法命名。“如果被允许，就出价”，我们把大量的逻辑判断都隐藏起来了，整个`action`只剩下两个`unless`。"Talk, don't ask!" 减少逻辑判断是保持代码可读性的有效方法之一，尽量避免`if else`的深度嵌套。

再者，为什么要传一个block给`bid_if_allow`呢？因为在`bid`的过程中，会产生一条出价记录是我们最直观能想到，所以创建记录的部分出现在这里是可以被接受的(_注：仅仅是能被接受，不是好_)，而像资金冻结，如果也出现在这里，则有违背单一责任之嫌。但这不是主要原因。原因是我需要返回一个http头部。`head, respond_to`都是controller中的方法，只有在controller中才能调用。这里也可以不用block，然后返回字符串，但是这又会导致在controller中判断，然后才能确定头部返回，不好。当然这些方法都在module中，我可以将其include到`BidderDecorator`中，但是不合适。controller就像一个服务生，他知道客户点的菜要交给哪位厨师去做，但端盘子送菜还得服务生自己来。这就是所谓的"fat model, skinny controller"了，服务生只负责接受客户点菜，让后厨做菜，然后给端上来。你要西餐，中餐，满汉全席，厨师负责。所以如果`bid_if_allow`能够直接返回http头部的话，那就责任混乱了！另外，注意到block中并没有用到`create!`这样会抛错的方法，而是让他在一旦记录创建失败时返回头部之后直接`return`，`bid`结束。这也就是为什么一定要让block在资金冻结前执行的原因，如果顺序相反，有可能成功冻结资金，但记录创建失败，而此时资金冻结不会回滚，<s>因为上文提到过ActiveRecord的transaction是不支持多model的。</s> **实际上是因为没有抛错来触发回滚。**

接着上面服务生和厨师的比喻，说说为什么不把拍卖部分的功能直接做到User下。想想，你开的是一家中餐馆，这几天突然有一两位客人嚷着要吃西餐，你会直接请几位做西餐的大厨吗？而我们这种做法，就好比请了个part-time。等到有一天你的西餐生意比较红火时，你可能直接开一家西餐厅了。所以，到时我们可能就有一个拍卖子系统了。到时，我可以非常方便的把我的`BidderDecorator`搬到新系统中，而且测试也只需要做少量的修改就能通过。

###总结

连续这两篇文章，算是我平时工作思考的总结。粗浅的谈论了一点设计模式，只为抛砖引玉。其实，我个人认为，设计模式不是架构师的专利，而是每一个程序员要都应该经常看和经常思考的。借鉴别人总结出来的经验，遇到合适的场景时，用来解决实际问题。即便你不能站在整个系统的高度来思考问题，你仍然能够在细微之处用到这些优秀的想法，帮助你写出更好的代码。
[1]: /RubyOnRails/2012/03/30/homeless-code-1/
[2]: http://en.wikipedia.org/wiki/Data,_context_and_interaction
[3]: https://github.com/jcasimir/draper
[4]: http://api.rubyonrails.org/classes/ActiveRecord/Transactions/ClassMethods.html
