module.exports = function(User) {

	User.disableRemoteMethod('find', true);
	User.disableRemoteMethod('exists', true);
	User.disableRemoteMethod('count', true);
	//User.disableRemoteMethod('upsert', true);
	User.disableRemoteMethod('updateAll', true);
	User.disableRemoteMethod('findOne', true);

	User.passwordUpdate = function(accessToken, password, next) {

		this.app.models.AccessToken.findById(accessToken, function(err, token) {
			if (err) {
				return next(err);
			} else if (!token) {
				return next(new Error('Token not found!'));
			}

			User.findById(token.userId, function(err, user) {
				if(err) {
					return next(err);
				} else if(!user) {
					return next(new Error('User not found!'));
				}

				user.updateAttribute("password", password, function(err, user) {
					if (err) {
						next(err);
					}

					return next(null, true);
				});
			});

		});
    }

    User.remoteMethod(
        'passwordUpdate',
        {
        	description: "Resets the user password with the reset token",
			accepts: [
				{arg: 'accessToken', type: 'string'},
				{arg: 'password', type: 'string'},
			],
			returns: {arg: 'result', type: 'boolean'}
        }
    );

	User.on('resetPasswordRequest', function (info) {
		if (info.user) {

			User.app.models.Email.send({
				async: true,
				to: info.user.email,
				from: 'hello@prud.io',
				subject: 'Reset your password',
				template: {
					name: "reset-password"
				},
				merge_vars: [
					{
						"rcpt": info.user.email,
						"vars": [
							{
								name: "name",
								content: info.user.fname
							},
							{
								name: "token",
								content: info.accessToken.id
							}]
					}
				]
			},
			function(err, result) {
				if(err) {
					console.error(err);
				}
			});
		}
	});

	User.observe('after save', function beforeSave(ctx, next) {

		// If instance = new object
		if (ctx.instance) {
			var user = ctx.instance;

			user.created  = new Date();
			user.modified = new Date();

			user.accounts.count(function(err, count) {
				if (err) {
					console.error('Error counting accounts: ', err);
					next(err);
				}

				if (count === 0) {
					var name = user.fname + " " + user.lname + "'s Account";

					user.accounts.create({
						name: name
					},
					function(err, account) {
						if (err) {
							console.error(err);
							next(err);
						}
						user.defaultAccountId = account.id;
						user.save();

						next();
					});

				}

				next();
			});

			// Send welcome e-mail
			User.app.models.Email.send({
				async: true,
				to: this.email,
				from: 'hello@prud.io',
				subject: 'Welcome to Prud.io',
				template: {
					name: "signup-e-mail"
				},
				merge_vars: [
					{
						"rcpt": this.email,
						"vars": [
							{
								name: "name",
								content: this.fname
							}]
					}
				]
			},
			function(err, result) {
				if(err) {
					console.error(err);
				}
				next(err);
			});
		}

		next();

	});

	User.observe('before save', function beforeSave(ctx, next) {

		// If instance = new object
		if (ctx.instance) {
			ctx.instance.created  = new Date();
			ctx.instance.modified = new Date();
		} else {
		    ctx.data.modified = new Date();
		}

		next();
	});


};
