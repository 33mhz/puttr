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
			var buttons = $('<div/>').addClass('row-fluid');
			$('<div/>').addClass('span11 offset1')
				.text('Logged in: ')
				.append(
					$('<strong/>').text(data.user.name + ' (@' + data.user.username + ')')
				).append(
					$('<button/>').click(logout).addClass('btn pull-right').text('Logout')
				).appendTo(buttons);
			buttons.appendTo($('#HaveAuthLoaded'));

			$('<div/>').addClass('row-fluid clearfix')
				.html('<p>&nbsp;</p>')
				.appendTo($('#HaveAuthLoaded'));

			var form = $('<form/>').append($('<fieldset/>')).addClass('hide');
			$('<input/>').attr('type', 'file')
				.attr('name', 'content')
				.appendTo(form.find('fieldset'));

			$('<button/>').text('Upload file')
				.addClass('btn btn-primary btn-block')
				.click(function() {
					form.find('input').click();
					return false;
				}).appendTo($('#HaveAuthLoaded')).wrap('<p></p>');

			form.appendTo($('#HaveAuthLoaded'));

			form.fileupload({
				dataType: 'json',
				url: 'https://alpha-api.app.net/stream/0/files',
				done: function (e, data) {
					var div = $('<div/>').css({maxHeight: '30px', overflow: 'hidden'});
					$('<input/>').attr('type', 'text')
						.val(data.result.data.url_short)
						.click(function() {
							$(this).focus();
							$(this).select();
						}).css({width: '50%', maxWidth: '256px'})
						.appendTo(div);
					div.append('&nbsp;' + data.result.data.name);

					data.context.replaceWith(div);
				},
				add: function (e, data) {
					data.context = $('<div class="progress progress-striped active"><div class="bar" style="width: 0%;"></div><span>Uploading...</span></div>').appendTo($('#HaveAuthLoaded'));
					data.submit();
				},
				formData: {
					access_token: config['auth_token'],
					type: "us.treeview.file",
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

			$('#HaveAuthLoaded, #HaveAuthLoader').toggleClass('hide');
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
