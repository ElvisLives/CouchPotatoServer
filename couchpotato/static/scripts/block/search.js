Block.Search = new Class({

	Extends: BlockBase,

	cache: {},

	create: function(){
		var self = this;

		self.el = new Element('div.search_form').adopt(
			new Element('div.input').adopt(
				self.input = new Element('input', {
					'events': {
						'keyup': self.keyup.bind(self),
						'focus': self.hideResults.bind(self, false)
					}
				}),
				new Element('a', {
					'events': {
						'click': self.clear.bind(self)
					}
				})
			),
			self.result_container = new Element('div.results_container', {
				'tween': {
					'duration': 200
				}
			}).adopt(
				new Element('div.pointer'),
				self.results = new Element('div.results')
			).fade('hide')
		);

		self.spinner = new Spinner(self.result_container);

		self.OuterClickStack = new EventStack.OuterClick();

		//debug
		//self.input.set('value', 'kick ass')
		//self.autocomplete()
	},

	clear: function(e){
		var self = this;
		(e).stop();

		self.input.set('value', '');
		self.input.focus()

		self.movies = []
		self.results.empty()
	},

	hideResults: function(bool){
		var self = this;

		if(self.hidden == bool) return;

		self.result_container.fade(bool ? 0 : 1)

		if(!bool && self.OuterClickStack.stack.length == 0)
			self.OuterClickStack.push(self.hideResults.bind(self, true), self.el);

		self.hidden = bool;
	},

	keyup: function(e){
		var self = this;

		if(['up', 'down'].indexOf(e.key) > -1){
			p('select item')
		}
		else if(self.q() != self.last_q) {
			self.autocomplete()
		}

	},

	autocomplete: function(delay){
		var self = this;

		if(!self.q()){
			self.hideResults(true)
			return
		}

		self.spinner.show()

		if(self.autocomplete_timer) clearTimeout(self.autocomplete_timer)
		self.autocomplete_timer = self.list.delay((delay || 300), self)
	},

	list: function(){
		var self = this;

		if(self.api_request) self.api_request.cancel();

		var q = self.q();
		var cache = self.cache[q];

		self.hideResults(false)

		if(!cache){
			self.api_request = Api.request('movie.search', {
				'data': {
					'q': q
				},
				'onComplete': self.fill.bind(self, q)
			})
		}
		else
			self.fill(q, cache)

		self.last_q = q;

	},

	fill: function(q, json){
		var self = this;

		self.spinner.hide();
		self.cache[q] = json

		self.movies = {}
		self.results.empty()

		Object.each(json.movies, function(movie){

			if(!movie.imdb || (movie.imdb && !self.results.getElement('#'+movie.imdb))){
				var m = new Block.Search.Item(movie);
				$(m).inject(self.results)
				self.movies[movie.imdb || 'r-'+Math.floor(Math.random()*10000)] = m
			}
			else {
				self.movies[movie.imdb].alternativeName({
					'name': movie.name
				})
			}

		});

	},

	loading: function(bool){
		this.el[bool ? 'addClass' : 'removeClass']('loading')
	},

	q: function(){
		return this.input.get('value').trim();
	}

});

Block.Search.Item = new Class({

	initialize: function(info){
		var self = this;

		self.info = info;
		self.alternative_names = [];

		self.create();

		self.OuterClickStack = new EventStack.OuterClick();
	},

	create: function(){
		var self = this;

		var info = self.info

		self.el = new Element('div.movie', {
			'id': info.imdb
		}).adopt(
			self.options = new Element('div.options'),
			self.data_container = new Element('div.data', {
				'tween': {
					duration: 400,
					transition: 'quint:in:out'
				},
				'events': {
					'click': self.showOptions.bind(self)
				}
			}).adopt(
				self.thumbnail = info.poster ? new Element('img.thumbnail', {
					'src': info.poster
				}) : null,
				new Element('div.info').adopt(
					self.name = new Element('h2', {
						'text': info.name
					}).adopt(
						self.year = info.year ? new Element('span', {
							'text': info.year
						}) : null
					),
					self.tagline = new Element('span', {
						'text': info.tagline
					}),
					self.director = self.info.director ?  new Element('span', {
						'text': 'Director:' + info.director
					}) : null,
					self.starring = info.actors ? new Element('span', {
						'text': 'Starring:'
					}) : null
				)
			)
		)

		if(info.actors){
			Object.each(info.actors, function(actor){
				new Element('span', {
					'text': actor.name
				}).inject(self.starring)
			})
		}

		self.alternativeName({
			'name': info.name
		});
	},

	alternativeName: function(alternative){
		var self = this;

		self.alternative_names.include(alternative);
	},

	showOptions: function(){
		var self = this;

		self.createOptions();

		if(!self.width)
			self.width = self.data_container.getCoordinates().width

		self.data_container.tween('margin-left', 0, self.width);

		self.OuterClickStack.push(self.closeOptions.bind(self), self.el);

	},

	add: function(e){
		var self = this;
		(e).stop();

		Api.request('movie.add', {
			'data': {
				'identifier': self.info.imdb,
				'name': self.name_select.get('value'),
				'quality': self.quality_select.get('value')
			},
			'useSpinner': true,
			'spinnerTarget': self.options,
			'onComplete': function(){
				self.options.empty();
				self.options.adopt(
					new Element('div.message', {
						'text': 'Movie succesfully added.'
					})
				);
			},
			'onFailure': function(){
				self.options.empty();
				self.options.adopt(
					new Element('div.message', {
						'text': 'Something went wrong, check the logs for more info.'
					})
				);
			}
		});
	},

	createOptions: function(){
		var self = this;

		if(!self.options.hasClass('set')){

			self.options.adopt(
				new Element('div').adopt(
					self.info.poster ? new Element('img.thumbnail', {
						'src': self.info.poster
					}) : null,
					self.name_select = new Element('select', {
						'name': 'name'
					}),
					self.quality_select = new Element('select', {
						'name': 'profile_identifier'
					}),
					new Element('a.button', {
						'text': 'Add',
						'events': {
							'click': self.add.bind(self)
						}
					})
				)
			);

			Array.each(self.alternative_names, function(alt){
				new Element('option', {
					'text': alt.name
				}).inject(self.name_select)
			})

			Array.each(Quality.profiles, function(q){
				new Element('option', {
					'value': q.indentifier,
					'text': q.label
				}).inject(self.quality_select)
			});

			self.options.addClass('set');
		}

	},

	closeOptions: function(){
		var self = this;

		self.data_container.tween('margin-left', self.width, 0);
	},

	toElement: function(){
		return this.el
	}

});