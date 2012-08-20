---
layout: post
title: Backbone.js tips and tricks
category: javascript
tags: backbone javascript
---

Learning Backbone.js these days, and I would like to share some tips and
tricks.

###1. Why 2xx encounter error callback ?

Backbone's `Model#save` ([documented here][1]) allows to pass both
success and error callbacks, and Backbone will decide which callback
to be executed by calling the `Model#validate`. That is to say,
`Model#validate` will be executed twice, one before posting data the
server(if validations passed) and one after the server responded.
So you may encounter to this situation, the server respond with 2xx,
but the error callback still be called. Then you may need to re-consider
about the validations in the Backbone model.

###2. Override toJSON to organize params

If you're using Backbone, please *don't* make ajax request in the view,
you should do it in a Backbone way, the Backbone model is responiable
for such works, and it's pretty convienent to use `Model#save`.

Assuming you're using Backbone with Rails, you may be familiar with
this.

{% highlight bash %}
Parameters: {"utf8"=>"✓",
              "authenticity_token"=>"E0o7Lxa4zkL7mP8trgjBfSS+HB0oK6e3iJXHmy3lr+0=",
              "run"=>{"date"=>"2012-8-20", "distance_in_metres"=>1000,
                "time_in_seconds"=>170, "pace_in_seconds_per_km"=>50,
                "shared_run_attributes"=>{"text"=>"I ran 1km in 0:00:50. That's 0:50
                  min/km!"}}, "id"=>"59"}
{% endhighlight %}

Look at the parameters, a hash embed with hashes, if you're constructing
the parameters manually, that would pretty easy, just a js object and
`jQusery.ajax` will convert it to json automatically. What if you're
using a Backbone model ? Say your backend controller accesses run's
parameters with `params[:run]`, and you have a Backbone model `Run`,
then you may initialize the model using `new Run({authenticity_token:
'token', run: {date: 2012-8-20}})`. If you want to set some values to
the `run`, you may have to do it this way

{% highlight javascript %}
  var run = run.get('run');
  run.distance_in_metres = 1000;
  run.set('run'); // if you want to trigger validations, you may need to set it back
{% endhighlight %} 

If you need to access `run.run` often, you probably think of making you
own setter in the model.

{% highlight javascript %}
  setAttrs: function(attrs) {
    var run = run.get('run');
    run = _.extend(run, attrs);
    run.set('run');
  }

  // then you can you it like run.setAttrs({key: val})
{% endhighlight %} 

This's kind of annoying and `run.run` looks wierd. I felt I was such an
idiot when @bodhi told me
that `toJSON` ([documented here][2]) can be override.
>   Return a copy of the model's attributes for JSON stringification.
This can be used for persistence, serialization, or for augmentation
before being handed off to a view.

Acutually, before saving a model to server, `toJSON` will be called to
convert the model's attributes to json.

{% highlight javascript %}
  toJSON: function() {
    var attrs = _.pick(this.attributes, 'utf8', 'authenticity_token');
    var run = _.reduce(this.attributes, function(memo, val, key) {
      if(!_.include(['utf8', 'authenticity_token', 'id'], key)) memo[key] = val;
      return memo;
      }, {});
    return _.extend(attrs, {run: run});
  }
{% endhighlight %} 

Override `toJSON` you can simply treat those embeded attributs as other normal
attributes, like `run.set('date', '2012-12-12')`. Avoiding distraction of 
params' format, now you can focus on the logic.

Hope these tips are helpful :-)
[1]: http://backbonejs.org/#Model-save
[2]: http://backbonejs.org/#Model-toJSON
