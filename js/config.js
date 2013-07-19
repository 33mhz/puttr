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
	"redirect_uri": window.location.protocol + '//' + window.location.host + window.location.pathname,
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

function postFile(e) {
	var file = $(this).data('file');
	if(file.kind === "image") {
		handlePostImage(file);
	} else {
		handlePostFile(file);
	}
	$('#PostModal').modal('show');
}

function deleteFile(e) {
	if(!confirm('Are you sure you want to delete this file?\n\nThis cannot be undone.')) {
		return;
	}
	$t = $(this);
	$t.text('Deleting...').off('click');
	var file = $(this).data('file');
	$.appnet.file.destroy(file.id).done(function() {
		$t.closest('.span2').prev().remove();
		$t.closest('.span2').remove();
		var div = $('<div/>').addClass('alert fade in alert-success text-center').text('Deleted!');
		div.alert();
		$('#LoadedFiles').before(div);
		setTimeout(function() { div.alert('close'); }, 1500);
	}).fail(function() {
		console.log(arguments);
		alert('Unable to delete that file! Please logout and try again.');
	});
	return false;
}

function handlePostFile(file) {
	var name = file.name;
	var pos = name.lastIndexOf('.');
	if(pos) {
		name = name.substring(0, pos);
	}
	$('#PostModal h3 span').text(name);
	$('#PostModal textarea').data('annotations', []).val('[' + name + '](' + file.url_short + ')').keyup();
}

function handlePostImage(file) {
	file = jQuery.extend(true, {}, file);
	var name = file.name;
	var pos = name.lastIndexOf('.');
	if(pos) {
		var ext = name.substring(pos);
		file.url_short += ext;
	}
	handlePostFile(file);
	var annotations = [{
		"type": "net.app.core.oembed",
		"value": {
			"+net.app.core.file": {
				"format": "oembed",
				"file_token": file.file_token,
				"file_id": file.id
			}
		}
	}];
	$('#PostModal textarea').data('annotations', annotations);
}

function loaded_file(file, into) {
	if(!file.url_short) {
		file.url_short = file.url_permanent || file.url;
	}
	var link = $('<a/>').text(file.name).attr('href', file.url_short);
	var buttons = [
		$('<a/>').addClass('btn btn-small').text('Post to ADN').data('file', file).click(postFile),
		' ',
		$('<a/>').addClass('btn btn-small btn-danger').text('Delete').data('file', file).click(deleteFile)
	];
	var div = $('<div/>');
	for(var i in buttons) {
		div.append(buttons[i]);
	}
	var divOuter = $('<div/>').addClass('span2').append(div)
	$('<div/>').addClass('span2 link').append(link).replaceAll(into).after(divOuter);
}

function uploadButton(e) {
	e.preventDefault();
	$('#UploadForm input[type=file]').click();
	return false;
}

var md_regex = /\[([^\[\]]+?)\]\(([^)]+?)\)/g;

function build_post(text, annotations) {
	var post = {
		annotations: annotations
	};
	
	var match, left, right, links = [], link;
	while((match = md_regex.exec(text))) {
		// full thing, text, url
		left = text.substring(0, match.index);
		right = text.substring(match.index + match[0].length);

		text = left + match[1] + right;

		link = {
			pos: match.index,
			len: match[1].length,
			url: match[2]
		};

		links.push(link);

		md_regex.lastIndex = match.index;
	}

	post.text = text;
	post.entities = { links: links, parse_links: true };
	return post;
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
				},
				dropZone: $('.dragdropzone'),
				paramName: 'content',
			});

			var submitButton = $('#PostModal .btn-primary'), lenP = $('#PostModal p');

			$('#PostModal textarea').keyup(function() {
				var text = $(this).val();
				text = text.replace(md_regex, '$1');
				var len = text.length;
				lenP.text(256 - len).removeClass('text-warning text-error text-success');
				submitButton.removeAttr('disabled');
				if(len > 256) {
					lenP.addClass('text-error');
					submitButton.attr('disabled', 'disabled');
				} else if(len === 256) {
					lenP.addClass('text-success');
				} else if(len > 236) {
					lenP.addClass('text-warning');
				}
			});

			submitButton.click(function() {
				submitButton.text('Posting...').attr('disabled', 'disabled');
				var post = build_post($('#PostModal textarea').val(), $('#PostModal textarea').data('annotations'));
				$.appnet.post.create(post).done(function() {
					$('#PostModal').modal('hide');
					var div = $('<div/>').addClass('alert fade in alert-success text-center').text('Posted!');
					div.alert();
					$('#LoadedFiles').before(div);
					setTimeout(function() { div.alert('close'); }, 1500);
					submitButton.text('Post').removeAttr('disabled');
				}).fail(function() {
					console.log(arguments);
					alert('Unable to post! Please logout and try again.');
					$('#PostModal').modal('hide');
				});
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
				$.appnet.file.getUser(postData).done(function(data) {
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
