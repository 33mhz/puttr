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
	$.cookie('adn_auth_token', token, { expires: 30 });
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
		// Second, check cookie
		if($.cookie('adn_auth_token')) {
			set_auth_token($.cookie('adn_auth_token'));
			return true;
		}
		// Third, nope!
		return false;
	} else {
		return true;
	}
}

function logout() {
	$.removeCookie('adn_auth_token');
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
				.text('Logged in as: ')
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
