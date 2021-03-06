var
	wl = window.location,
	config = {
		"client_id": "Nsup4QJpO1u2_-bgC-0Uq09X0pYuXXw7",
		"scope": "write_post files:pnut.puttr.file",
		"redirect_uri": wl.protocol + '//' + wl.host + wl.pathname,
		"response_type": "token"
	},
	md_regex = /\[([^\[\]]+?)\]\(([^)]+?)\)/g;

function generate_login_link() {
	var base = "https://pnut.io/oauth/authenticate?";
	for(var idx in config) {
		base += encodeURIComponent(idx) + "=" + encodeURIComponent(config[idx]) + "&";
	}
	return base
}

function set_auth_token(token) {
	config['auth_token'] = token;
	$.appnet.authorize(token);
	localStorage['pnut_auth_token'] = token;
}

function set_setting(name, val) {
	switch(name) {
		case 'numload':
			if(val < 3 || val > 200) {
				return;
			}
			break;
	}
	localStorage[name] = val;
}

function get_setting(name) {
	var defaults = {
		'numload': 24,
		'urlType': '0',
		'default_tick': '1',
		'post_length': 256,
		'post_id_length': 10
	};
	return localStorage[name] || defaults[name];
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
		if(localStorage['pnut_auth_token']) {
			set_auth_token(localStorage['pnut_auth_token']);
			return true;
		}
		// Third, nope!
		return false;
	} else {
		return true;
	}
}

function logout() {
	localStorage.removeItem('pnut_auth_token');
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
		$t.closest('.span4').remove();
		showAlert('Deleted!');
		updateUser();
		multiFile();
	}).fail(function() {
		console.log(arguments);
		alert('Unable to delete that file! Please logout and try again.');
	});
	return false;
}

function handlePostMulti() {
	if($('.toggleButton.active').length === 0) {
		return;
	}
	var annotations = {}, msgs = [], images = 1;
	$('.toggleButton.active').each(function() {
		var file = $(this).data('file'), url;
		file = jQuery.extend(true, {}, file);
		var name = file.name;
		var pos = name.lastIndexOf('.');
		if(pos) {
			name = name.substring(0, pos);
		}
		if(file.kind === "image") {
			if(get_setting('urlType') === '1') {
				url = 'https://photos.pnut.io/{object_id}/' + images;
				images++;
			} else {
				url = file.url_short;
			}
			if (typeof annotations["io.pnut.core.oembed"] === "undefined") {
				annotations["io.pnut.core.oembed"] = []
			}
			annotations["io.pnut.core.oembed"].push({
				"+io.pnut.core.file": {
					"format": "oembed",
					"file_token": file.file_token,
					"file_id": file.id
				}
			});
		} else {
			url = file.url_short;
		}
		msgs.push('[' + name + '](' + url + ')')
	});
	$('#PostModal h3 span').text($('#MultiFile span').text());
	$('#PostModal textarea').data('raw', annotations).val(msgs.join(' ')).keyup();
	if(images > 1) {
		$('#PostModal p span').last().text('{object_id} will be replaced with the correct value when posting.');
	} else {
		$('#PostModal p span').last().text('');
	}
	$('#PostModal').modal('show');
}

function handlePostFile(file) {
	var name = file.name;
	var pos = name.lastIndexOf('.');
	if(pos) {
		name = name.substring(0, pos);
	}
	$('#PostModal h3 span').text(name);
	$('#PostModal textarea').data('raw', []).val('[' + name + '](' + file.url_short + ')').keyup();
	$('#PostModal p span').last().text('');
}

function handlePostImage(file) {
	file = jQuery.extend(true, {}, file);
	handlePostFile(file);
	var annotations = [{
		"type": "io.pnut.core.oembed",
		"value": {
			"+io.pnut.core.file": {
				"format": "oembed",
				"file_token": file.file_token,
				"file_id": file.id
			}
		}
	}];
	$('#PostModal textarea').data('raw', annotations);
	if(get_setting('urlType') === '1') {
		$('#PostModal textarea').val('[' + $('#PostModal h3 span').text() + '](https://photos.pnut.io/{object_id}/1)').keyup();
		$('#PostModal p span').last().text('{object_id} will be replaced with the correct value when posting.');
	}
}

function multiFile() {
	var count = $('.toggleButton.active').length;
	if(count === 0) {
		$('#MultiFile button').attr('disabled', true);
		$('#MultiFile span').text('0 files');
	} else {
		$('#MultiFile button').removeAttr('disabled');
		if(count === 1) {
			$('#MultiFile span').text('1 file');
		} else {
			$('#MultiFile span').text(count + ' files');
		}
		$('#MultiFile').removeClass('hide');
	}
}

function loaded_file(file, into, tick) {
	if(!file.url_short) {
		file.url_short = file.url;
	}

	var link = $('<a/>').text(file.name).attr('href', file.url_short).attr('title', file.name);
	var buttons = [
		$('<div class="btn-group" />').append(
			$('<button type="button" data-toggle="button" />')
				.addClass('btn btn-small toggleButton')
				.data('file', file)
				.html('<i class="icon-ok"></i>')
		).append(
			$('<a/>').addClass('btn btn-small').html('<i class="icon-share"></i>').data('file', file).click(postFile)
		).append(
			$('<a/>').addClass('btn btn-small btn-danger').html('<i class="icon-trash icon-white"></i>').data('file', file).click(deleteFile)
		)
	];
	var div = $('<div/>').addClass('buttons');
	for(var i in buttons) {
		div.append(buttons[i]);
	}
	$('<div/>').addClass('span4').append(link).append(div).replaceAll(into);
	if(tick && get_setting('default_tick') === '1') {
		div.find('.toggleButton').click();
	}
}

function uploadButton(e) {
	e.preventDefault();
	$('#UploadForm input[type=file]').click();
	return false;
}

function build_post(text, annotations) {
	var post = {
		raw: annotations,
		text: text
	};

	return post;
}

function niceBytes(bytes) {
	if(bytes < 1000) {
		return "" + bytes;
	}
	var toGo = Math.floor(bytes/1000);
	bytes %= 1000;
	if(bytes < 10) {
		bytes = '00' + bytes;
	} else if(bytes < 100) {
		bytes = '0' + bytes;
	}
	return niceBytes(toGo) + ',' + bytes;
}

function niceSize(bytes) {
	var nice = '', addBytes = false;
	size = bytes;

	if(size < 1024) {
		// no-op
	} else {
		addBytes = true;
		size /= 1024;
		if(size < 1024) {
			// KiB
			nice += size.toFixed(2) + ' KiB';
		} else {
			size /= 1024;
			if(size < 1024) {
				// MiB
				nice += size.toFixed(2) + ' MiB';
			} else {
				// GiB
				size /= 1024;
				nice += size.toFixed(2) + ' GiB';
			}
		}
	}

	if(addBytes) {
		bytes = niceBytes(bytes);
		nice += ' (' + bytes + ' bytes)';
	}
	return nice;
}

function updateUser(callback) {
	$.appnet.token.get().done(function(data) {
		if(data.meta.code !== 200) {
			alert("Error talking to Pnut!");
			logout();
			console.log(data);
		} else {
			data = data.data;
			// Store token info for later (wink wink)
			config['data'] = data;
			setupUser();
			if(callback && typeof callback === 'function') {
				callback.call(this, data);
			}
		}
	}).fail(function() {
		alert("Error talking to Pnut!");
		logout();
		console.log(arguments);
	});
}

function updateConfig() {
	$.appnet.config.get().done(function(data) {
		if(data.meta.code !== 200) {
			console.log(arguments);
			// Try again in 5 minutes
			setTimeout(updateConfig, 300000);
		} else {
			data = data.data;
			set_setting('post_length', data.post.max_length);
			set_setting('post_id_length', 6); // was data.text.uri_template_length.post_id
			// Try again in a day
			setTimeout(updateConfig, 86400000);
		}
	}).fail(function() {
		console.log(arguments);
		// Try again in 5 minutes
		setTimeout(updateConfig, 300000);
	});
}

function setupUser() {
	$('#Username').text(config.data.user.name + ' (@' + config.data.user.username + ')');
	$('#AvailableSpace').text(niceSize(config.data.storage.available));
	config['max_size'] = Math.min(104857600, config.data.storage.available); // was config.data.limits.max_file_size
	$('#MaxFileSize').text(niceSize(config.max_size));
}

function setupButtons() {
	$('#Logout').off('click', logout).on('click', logout);
	$('#UploadButton').off('click', uploadButton).on('click', uploadButton);
	$('#LoadMore a').off('click', loadMore).on('click', loadMore);
	$(document).off('click', '.toggleButton', multiFile).on('click', '.toggleButton', multiFile);
	$('#MultiFile button').off('click', handlePostMulti).on('click', handlePostMulti);
}

function showAlert(text, c, expire, before) {
	if(!text) {
		return;
	}
	if(typeof c === 'undefined') {
		c = 'success';
	}
	if(typeof expire === 'undefined') {
		expire = 1500;
	}
	if(!before) {
		before = '#LoadedFiles';
	}

	var div = $('<div/>').addClass('alert fade in text-center').addClass('alert-' + c);
	div.text(text);
	div.prepend('<button type="button" class="close" data-dismiss="alert">&times;</button>');
	div.alert();
	$(before).before(div);
	if(expire) {
		setTimeout(function() {
			div.alert('close');
		}, expire);
	}
}

function setupUploadForm() {
	$('#UploadForm').fileupload({
		dataType: 'json',
		url: 'https://api.pnut.io/v1/files',
		formData: {
			type: "pnut.puttr.file",
			is_public: true
		},
		headers: {authorization: 'Bearer ' + config.auth_token},
		dropZone: $('.dragdropzone'),
		paramName: 'content',
		autoUpload: true,
		limitConcurrentUploads: 5
	}).bind('fileuploadadd', function (e, data) {
		var file = data.files[0];

		if(file.size > config.max_size) {
			showAlert('That file is too big', 'error');
			return false;
		} else {
			data.context = add_file(true)
		}
	}).bind('fileuploadsend', function(e, data) {
		if(!data.context) {
			return false;
		}
	}).bind('fileuploaddone', function (e, data) {
		loaded_file(data.result.data, data.context, true);
		updateUser();
	}).bind('fileuploadprogress', function (e, data) {
		if(!data.context) {
			return;
		}
		var progress = parseInt(data.loaded / data.total * 100, 10);
		if(progress > 50) {
			data.context.find('span').remove();
			data.context.find('.bar').text('Uploading...');
		}
		data.context.find('.bar').css('width', progress + '%');
	}).bind('fileuploadfail', function(e, data) {
		var res = data.jqXHR.responseJSON;
		var message = res.meta.error_message;
		showAlert(message, 'error', false);
		
		data.context.addClass('text-error text-center').text('Error!');
		setTimeout(function() { data.context.remove(); }, 3000);
		
		updateUser();
		console.log(res);
	});

	if(typeof window.ondrop === 'undefined') {
		$('.dragdropzone').remove();
	}
}

function setupPostModal() {
	var submitButton = $('#PostModal .btn-primary'), lenP = $('#PostModal p span').first();

	$('#PostModal textarea').keyup(function() {
		var text = $(this).val();
		text = text.replace(md_regex, '$1');
		var len = punycode.ucs2.decode(text).length;
		var post_ids = text.match(/{object_id}/g);
		if(post_ids) {
			len -= (post_ids.length * 9);
			len += (post_ids.length * get_setting('post_id_length'));
		}
		lenP.text(get_setting('post_length') - len).removeClass('text-warning text-error text-success');
		submitButton.removeAttr('disabled');
		if(len > get_setting('post_length')) {
			lenP.addClass('text-error');
			submitButton.attr('disabled', 'disabled');
		} else if(len === get_setting('post_length')) {
			lenP.addClass('text-success');
		} else if(len > (get_setting('post_length') - 20)) {
			lenP.addClass('text-warning');
		}
	});

	submitButton.click(function() {
		submitButton.text('Posting...').attr('disabled', 'disabled');
		var post = build_post($('#PostModal textarea').val(), $('#PostModal textarea').data('raw'));
		$.appnet.post.create(post).done(function() {
			$('#PostModal').modal('hide');
			showAlert('Posted!');
			submitButton.text('Post').removeAttr('disabled');
			$('.toggleButton.active').removeClass('active');
			multiFile();
		}).fail(function() {
			console.log(arguments);
			alert('Unable to post! Please logout and try again.');
			$('#PostModal').modal('hide');
		});
	});
}

function setupSettingsModal() {
	$('#SettingsModal .modal-body button').each(function() {
		var name = $(this).attr('name'), val = $(this).attr('data-value');
		if(get_setting(name) == val) {
			$(this).addClass('active');
		} else {
			$(this).removeClass('active');
		}
		$(this).click(function() {
			set_setting(name, val);
		});
	});
	$('#SettingsModal .modal-body input').each(function() {
		var name = $(this).attr('name');
		$(this).val(get_setting(name));
		$(this).change(function() {
			set_setting(name, $(this).val());
		});
	});
}

function loadMore() {
	$('#LoadMore').addClass('hide');
	$('#HaveAuthLoader').removeClass('hide');
	var postData = {
		'include_private': 0,
		'include_incomplete': 0,
		count: get_setting('numload')
	};
	if($('#LoadMore').data('min_id')) {
		postData['before_id'] = $('#LoadMore').data('min_id');
	}
	$.appnet.file.getUser(postData).done(function(data) {
		if(data.data.length > 0) {
			for(var i = 0; i < data.data.length; ++i) {
				loaded_file(data.data[i], add_file(), false);
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
}

function logged_in_setup() {
	updateUser(function(data) {
		// Rebind everything
		setupButtons();
		setupUploadForm();
		setupPostModal();
		setupSettingsModal();

		$('#HaveAuthLoaded').removeClass('hide');

		$('#LoadMore a').click();
	});
	updateConfig();
}

if(have_auth_token()) {
	$('#HaveAuth').removeClass('hide');
	logged_in_setup();
} else {
	$('#LoginButton').attr('href', generate_login_link());
	$('#NeedAuth').removeClass('hide');
}
