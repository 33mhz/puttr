jQuery.fn.selectText = function(){
    var doc = document
        , element = this[0]
        , range, selection
    ;
    if (doc.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        selection = window.getSelection();        
        range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};

var config = {
	"client_id": "czv7anuSkX4UTyN7PmHvvVLxfCQK2U3X",
	"scope": "write_post files",
	"redirect_uri": document.location.origin + document.location.pathname,
	"response_type": "token"
};

function generate_login_link() {
	var base = "https://account.app.net/oauth/authenticate?";
	for(var idx in config) {
		base += encodeURIComponent(idx) + "=" + encodeURIComponent(config[idx]) + "&";
	}
	return base
}

function set_auth_token(token) {
	config['auth_token'] = token;
	$.appnet.authorize(token);
	localStorage['adn_auth_token'] = token;
}

function have_auth_token() {
	if(typeof config['auth_token'] === "undefined") {
		// First check hash
		var hash = document.location.hash;
		if(hash && hash.substring(0, 14) === '#access_token=') {
			set_auth_token(hash.substring(14));
			document.location.hash = '';
			return true;
		}
		// Second, check locale storage
		if(localStorage['adn_auth_token']) {
			set_auth_token(localStorage['adn_auth_token']);
			return true;
		}
		// Third, nope!
		return false;
	} else {
		return true;
	}
}

function logout() {
	localStorage.removeItem('adn_auth_token');
	config['auth_token'] = undefined;
	$('#HaveAuthLoaded').html('').addClass('hide');
	$('#HaveAuth,#NeedAuth').toggleClass('hide');
	$('#HaveAuthLoader').removeClass('hide');
	$('#LoginButton').attr('href', generate_login_link());
	$('#Username').text('');
	$('#LoadedFiles').html('');
}

function add_file(prepend) {
	var div = $('<div/>').addClass('span4');
	var progress = $('<div/>').addClass('progress progress-striped active');
	var bar = $('<div/>').addClass('bar').css('width', '0%');
	var span = $('<span>').text('Uploading...');
	progress.append(bar).append(span).appendTo(div);
	if(prepend) {
		div.prependTo($('#LoadedFiles'));
	} else {
		div.appendTo($('#LoadedFiles'));
	}
	return div;
}

function loaded_file(file, into) {
	if(!file.url_short) {
		file.url_short = file.url_permanent || file.url;
	}
	var link = $('<code/>').append(
		$('<a/>').text(file.url_short).attr('href', file.url_short)
	);
	var div = $('<div/>').text(file.name)
					.click(function() {
						link.selectText();
					});
	var divOuter = $('<div/>').addClass('span2').append(div)
	$('<div/>').addClass('span2').append(link).replaceAll(into).after(divOuter);
}

function uploadButton(e) {
	e.preventDefault();
	$('#UploadForm input[type=file]').click();
	return false;
}

function logged_in_setup() {
	$.appnet.token.get().done(function(data) {
		if(data.meta.code !== 200) {
			alert("Unable to login!");
			logout();
		} else {
			data = data.data;
			// We want limits!
			config['max_size'] = Math.min(data.limits.max_file_size, data.storage.available - data.storage.used);
			// Store token info for later (wink wink)
			config['user_data'] = data;

			// Logged in as and logout buttons
			$('#Username').text(data.user.name + ' (@' + data.user.username + ')');
			$('#Logout').off('click', logout).on('click', logout);

			$('#UploadButton').off('click', uploadButton).on('click', uploadButton);

			$('#UploadForm').fileupload({
				dataType: 'json',
				url: 'https://alpha-api.app.net/stream/0/files',
				done: function (e, data) {
					loaded_file(data.result.data, data.context);
				},
				add: function (e, data) {
					data.context = add_file(true)
					data.submit();
				},
				formData: {
					access_token: config['auth_token'],
					type: "us.treeview.puttr",
					public: true
				},
				progress: function (e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					if(progress > 50) {
						data.context.find('span').remove();
						data.context.find('.bar').text('Uploading...');
					}
					data.context.find('.bar').css('width', progress + '%');
				}
			});

			$('#HaveAuthLoaded').toggleClass('hide');

			$('#LoadMore a').click(function(e) {
				$('#LoadMore').addClass('hide');
				$('#HaveAuthLoader').removeClass('hide');
				var postData = {
					'include_private': 0,
					'include_incomplete': 0,
					count: 24
				};
				if($('#LoadMore').data('min_id')) {
					postData['before_id'] = $('#LoadMore').data('min_id');
				}
				$.appnet.file.getUserFiles(postData).done(function(data) {
					if(data.data.length > 0) {
						for(var i = 0; i < data.data.length; ++i) {
							loaded_file(data.data[i], add_file());
						}
					}

					if(data.meta.more) {
						$('#LoadMore').data('min_id', data.meta.min_id).removeClass('hide');
					} else {
						$('#LoadMore').addClass('hide').data('min_id', null);
					}

					$('#HaveAuthLoader').addClass('hide');
				});

				return false;
			}).click();
		}
	}).fail(function() {
		console.log(arguments);
		alert("Unable to login!");
		logout();
	});
}

if(have_auth_token()) {
	$('#HaveAuth').removeClass('hide');
	logged_in_setup();
} else {
	$('#LoginButton').attr('href', generate_login_link());
	$('#NeedAuth').removeClass('hide');
}
