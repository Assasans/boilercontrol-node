const app = require('./app');

const sprintf = require('sprintf-js').sprintf;
const Promise = require('bluebird');
const bcrypt = require('bcrypt');
const chalk = require('chalk');
const mysql = require('mysql');
const Enum = require('enum');
const Joi = require('joi');

const fs = Promise.promisifyAll(require('fs'));

/* JSON validation schemes */

const scheme_main = Joi.object().keys({
	session: Joi.any().required(), //TODO Integrate session key
	code: Joi.number().required(),
	root: Joi.object().required()
});

//Authentication
const scheme_authUser = Joi.object().keys({
	name: Joi.string().required(),
	password: Joi.string().required(),
});

const scheme_ping = Joi.object().empty();

/* Data operations */

const scheme_dataPush = Joi.object().keys({
	timestamp: Joi.number().required(),
	values: Joi.object().required().keys({
		temperature: Joi.object().keys({
			gas: Joi.object().keys({
				in: Joi.number(),
				out: Joi.number()
			}),
			water: Joi.object().keys({
				in: Joi.number(),
				out: Joi.number()
			}),
			floor: Joi.object().keys({
				in: Joi.number(),
				out: Joi.number()
			})
		})
	})
});

const scheme_dataPull = Joi.object().keys({
	scope: Joi.array().items(
		Joi.number().required(),
		Joi.number().required()
	).length(2).required(),
	values: Joi.object().required().keys({
		temperature: Joi.object().keys({
			gas: Joi.object().keys({
				in: Joi.bool().required(),
				out: Joi.bool().required()
			}),
			water: Joi.object().keys({
				in: Joi.bool().required(),
				out: Joi.bool().required()
			}),
			floor: Joi.object().keys({
				in: Joi.bool().required(),
				out: Joi.bool().required()
			})
		})
	})
});

/* Config operations */


const scheme_getConfig = Joi.object().keys({
	side: Joi.string().required()
});

const scheme_setConfig = Joi.object().keys({
	side: Joi.string().required(),
	config: Joi.object().required()
});

const moduleName = "API";
const moduleAuthName = "Auth";
module.exports.API = function() {
	var main = this;

	var connection = mysql.createConnection({
		host    : '*YOUR_HOST*', //Default 'localhost'
		user    : '*YOUR_USERNAME*',
		password: '*YOUR_PASSWORD*',
		database: '*YOUR_DB*' //Defualt 'boiler'
	});

	const RequestCode = new Enum({
		Ping: 8,
		Pong: 9,

		GetConfig: 23,
		SetConfig: 25,

		PullData: 27,
		PushData: 29,

		RegisterUser: 64,
		LoginUser: 66,
	});
	
	const ResponseCode = new Enum({
		Welcome: 3,

		AuthRequired: 5,

		Pong: 9,

		Error: 15,
		CommandReceived: 16,

		GotConfig: 24,

		PulledData: 28,
		PushedData: 30,

		RegisteredUser: 65,
		LoggedUser: 67,
	});

	const Errors = new Enum({
		FileReadError: 10,
		FileWriteError: 11,

		JsonParseError: 15,
		JsonValidationError: 16,

		PingMustEmpty: 20,
		

		IncorrectUsername: 32,
		IncorrectPassword: 33,

		SQLError: 48,

		CheckPassword: 56,

		IncorrectAPIKey: 64
	});

	this.open = function() {
		app.utils.log(
			sprintf(
				"%s %s",
				chalk.blue("Connecting to"),
				chalk.yellow.bold("MySQL...")
			),
			moduleName,
			app.utils.Level.INFO
		);
		connection.connect(function(error) {
			if(error) {
				app.utils.log(
					sprintf(
						"%s\n%s %s\n%s %s\n%s %s",
						chalk.red.bold("Cannot connect!"),
						chalk.red("Error code:"), chalk.keyword('orange').bold(error.errno),
						chalk.red("Error name:"), chalk.keyword('orange').bold(error.name),
						chalk.red("Error message:"), chalk.keyword('orange').bold(error.message),
						chalk.red("Stack trace:"), chalk.keyword('orange').bold(error.stack)
					),
					moduleName,
					app.utils.Level.ERROR
				);
				return;
			}
		
			app.utils.log(
				sprintf(
					"%s %s",
					chalk.blue("Done! Thread ID: "),
					chalk.keyword('lime').bold(connection.threadId)
				),
				moduleName,
				app.utils.Level.INFO
			);
		});
	};

	/* JSON helpers */

	this.validate = function(json, scheme) {
		return new Promise(function(resolve, reject) {
				Joi.validate(json, scheme, function(error, value) {
				if(error) {
					app.utils.log(
						sprintf(
							"%s\n%s %s",
							chalk.red("Incorrect JSON body!"),
							chalk.red("Error object: "),
							chalk.keyword('orange').bold(error)
						),
						moduleName,
						app.utils.Level.ERROR
					);
					return reject(error);
				}
				return resolve(value);
			});
		});
	};

	this.parseJSON = function(input) {
		return new Promise(function(resolve, reject) {
			try {
				//Parsing at node level
				var json = JSON.parse(input);
				//Validation at API level
				main.validate(json, scheme_main).then(
					value => {
						return resolve(value);
					},
					error => {
						return reject(error);
					}
				)
			} catch(exception) {
				//Catch exception while parsing JSON at node level
				app.utils.log(
					sprintf(
						"%s\n%s %s",
						chalk.red("Cannot parse JSON object (Node level)!"),
						chalk.red("Error: "),
						chalk.keyword('orange').bold(exception)
					),
					moduleName,
					app.utils.Level.ERROR
				);
				return reject(exception);
			}
		});
	};

	/* Senders */

	//Main command handler
	this.handleCommand = function(message, client, clientInfo) {
		app.api.parseJSON(message).then(
			value => {
				var root = value.root;
				var code = value.code;
		
				client.send(app.api.receivedCommand(clientInfo, RequestCode.getValue(code)));
		
				switch(code) {
					case RequestCode.Ping.value:
						app.api.handlePing(clientInfo, root).then(
							result => {
								client.send(result);
								app.utils.log(
									sprintf("Sent 'Pong' to client (ID: %s).", clientInfo.uuid),
									moduleName,
									app.utils.Level.DEBUG
								);
							},
							error => {
								client.send(error);
								app.utils.log(
									sprintf("Sent error 'Pong' to client (ID: %s).", clientInfo.uuid),
									moduleName,
									app.utils.Level.DEBUG
								);
							}
						)
						break;
						
					case RequestCode.GetConfig.value:
						var result = app.api.getConfig(root, clientInfo);
						client.send(result);
						app.utils.log(
							sprintf("Sent config to client (ID: %s).", clientInfo.uuid),
							moduleName,
							app.utils.Level.DEBUG
						);
						break;
					case RequestCode.SetConfig.value: //FIXME Add function
						var result = app.api.setConfig(root, clientInfo);
						client.send(result);
						app.utils.log(
							sprintf("Get config from client (ID: %s).", clientInfo.uuid),
							moduleName,
							app.utils.Level.DEBUG
						);
						break;
		
					case RequestCode.PushData.value:
						app.api.pushData(root, clientInfo);
						app.utils.log(
							sprintf("Client (ID: %s) pushed data.", clientInfo.uuid),
							moduleName,
							app.utils.Level.DEBUG
						);
						break;
					case RequestCode.PullData.value:
						var result = app.api.pullData(root, clientInfo);
						client.send(result);
		
						app.utils.log(
							sprintf("Client (ID: %s) pulled data.", clientInfo.uuid),
							moduleName,
							app.utils.Level.DEBUG
						);
						break;
		
					//TODO Add reqistration command handler
					case RequestCode.LoginUser.value:
						app.utils.log(
							sprintf("Client (ID: %s) sent request to login as user.", clientInfo.uuid),
							moduleName,
							app.utils.Level.DEBUG
						);
						var result = app.api.authUser(root, clientInfo).then(
							result => {
								client.send(result);
		
								app.utils.log(
									sprintf("Response for client (ID: %s) for authentication request has been sent..", clientInfo.uuid),
									moduleName,
									app.utils.Level.DEBUG
								);
							},
							error => {
								client.send(JSON.stringify({
									error: true,
									code: ResponseCode.LoggedUser.value,
									error_object: {
										type: error.type,
										name: error.error.name,
										message: error.error.message
									},
									client: clientInfo
								}));
		
								app.utils.log(
									sprintf("Client (ID: %s) has been sent incorrect JSON request.", clientInfo.uuid),
									moduleName,
									app.utils.Level.DEBUG
								);
							}
						);
						break;
				}
			},
			error => {
				client.send(JSON.stringify({
					error: true,
					code: ResponseCode.Error.value,
					error_object: {
						type: Errors.JsonValidationError.value,
						name: error.name,
						message: error.message
					},
					client: clientInfo
				}));
			}
		)		
	};

	/* Authentication */

	this.authUser = function(json, client) {
		return new Promise(function(resolve, reject) {
			main.validate(json, scheme_authUser).then(
				value => {
					var name = value.name;
					var password = value.password;
	
					app.utils.log(
						sprintf(
							"%s '%s' %s '%s'",
							chalk.blue("Try to authenticate user"),
							chalk.keyword('lime').bold(name),
							chalk.blue("with password"),
							chalk.keyword('lime').bold(password)
						),
						moduleAuthName,
						app.utils.Level.DEBUG
					);
					var query = connection.query('SELECT * FROM users WHERE name = ?', [name], function(error, result) {
						if(error) {
							app.utils.log(
								sprintf(
									"%s\n%s %s",
									chalk.red("Cannot get user from MySQL!"),
									chalk.red("Error: "),
									chalk.keyword('orange').bold(error)
								),
								moduleName,
								app.utils.Level.ERROR
							);
							return resolve(JSON.stringify({
								error: true,
								code: ResponseCode.LoggedUser.value,
								error_object: {
									type: Errors.SQLError.value,
									errno: error.errno,
									message: error.message,
									name: error.name,
									sql: error.sql
								},
								client: client
							}));
						}
						app.utils.log(
							sprintf(
								"%s",
								chalk.blue("User got from MySQL!")
							),
							moduleName,
							app.utils.Level.DEBUG
						);
						
						//Comparing passwords
						if(result.length == 0) {
							app.utils.log(
								sprintf(
									"%s",
									chalk.green("Password is not verified!")
								),
								moduleName,
								app.utils.Level.DEBUG
							);
							
							return resolve(JSON.stringify({
								error: true,
								code: ResponseCode.LoggedUser.value,
								error_object: {
									type: Errors.IncorrectUsername.value,
									name: name,
									verified: false
								},
								client: client
							}));
						}
						bcrypt.compare(password, result[0].password).then(
							cmp_result => {
								//If password is correct
								if(cmp_result == true) {
									app.utils.log(
										sprintf(
											"%s",
											chalk.green("Password is verified!")
										),
										moduleName,
										app.utils.Level.DEBUG
									);
		
									return resolve(JSON.stringify({
										error: false,
										code: ResponseCode.LoggedUser.value,
										result: { //TODO Add session ID
											name: result[0].name,
											uuid: result[0].uuid,
											verified: true
										},
										client: client
									}));
								} else { //If password is incorrect
										app.utils.log(
										sprintf(
											"%s",
											chalk.green("Password is not verified!")
										),
										moduleName,
										app.utils.Level.DEBUG
									);
									
									return resolve(JSON.stringify({
										error: true,
										code: ResponseCode.LoggedUser.value,
										error_object: {
											type: Errors.IncorrectPassword.value,
											name: result[0].name,
											uuid: result[0].uuid,
											verified: false
										},
										client: client
									}));
								}
							},
							//On error
							cmp_error => {
								app.utils.log(
									sprintf(
										"%s\n%s %s",
										chalk.red("Error on comparing passwords!"),
										chalk.red("Error: "),
										chalk.keyword('orange').bold(cmp_error)
									),
									moduleName,
									app.utils.Level.ERROR
								);
								return reject({
									type: Errors.CheckPassword.value,
									error: cmp_error
								});
							}
						);
					});
				},
				error => {
					return reject({
						type: Errors.JsonValidationError.value,
						error: error
					});
				}
			);
		});
	};

	/* Handlers */

	this.receivedCommand = function(client, command) {
		return JSON.stringify({
			error: null,
			code: ResponseCode.CommandReceived.value,
			command: command,
			client: client
		});
	};

	this.handlePing = function(client, json) {
		return new Promise(function(resolve, reject) {
			main.validate(json, scheme_ping).then(
				value => {
					return resovle(JSON.stringify({
						error: false,
						code: ResponseCode.Pong.value,
						client: client
					}));
				},
				error => {
					return reject(JSON.stringify({
						error: true,
						code: ResponseCode.Pong.value,
						error_object: {
							type: Errors.PingMustEmpty.value
						},
						client: client
					}));
				}
			);
		});
	};
	
	this.pushData = function(json, client) {
		main.validate(json, scheme_dataPush).then(
			value => {
				var json_string = JSON.stringify(value);
				var query = connection.query('INSERT INTO data (id, json) VALUES (NULL, ?)', [json_string], function(error, result) {
					if(error) {
						app.utils.log(
							sprintf(
								"%s\n%s %s",
								chalk.red("Cannot insert data to MySQL!"),
								chalk.red("Error: "),
								chalk.keyword('orange').bold(error)
							),
							moduleName,
							app.utils.Level.ERROR
						);
						return JSON.stringify({
							error: true,
							code: ResponseCode.PushedData.value,
							error_object: {
								errno: error.errno,
								message: error.message,
								name: error.name,
								sql: error.sql
							},
							client: client
						});
					}
					app.utils.log(
						sprintf(
							"%s\n%s %s",
							chalk.blue("Data sucessfully inserted to MySQL!"),
							chalk.blue("Affected rows: "),
							chalk.keyword('lime').bold(result.affectedRows)
						),
						moduleName,
						app.utils.Level.DEBUG
					);
				});
				return JSON.stringify({
					error: false,
					code: ResponseCode.PushedData.value,
					client: client
				});
			},
			error => {
				return;
			}
		);
	};

	this.pullData = function(json, client) {
		return new Promise(function(resolve, reject) {
			main.validate(json, scheme_dataPull).then(
				value => {
					var resultScope = value.scope;
					var query = connection.query('SELECT * FROM data ORDER BY ID DESC LIMIT 1', function(error, result) {
						if(error) {
							app.utils.log(
								sprintf(
									"%s\n%s %s",
									chalk.red("Cannot get last index from MySQL!"),
									chalk.red("Error: "),
									chalk.keyword('orange').bold(error)
								),
								app.utils.Level.ERROR
							);
							return reject(JSON.stringify({
								error: true,
								code: ResponseCode.PushedData.value,
								error_object: {
									errno: error.errno,
									message: error.message,
									name: error.name,
									sql: error.sql
								},
								client: client
							}));
						}

						if(json.scope[1] == -1) {
							resultScope[1] = result[0].id; //Up to last entry
						}

						app.utils.log(
							sprintf(
								"%s",
								chalk.blue("MySQL request is successfull! (Get last index)")
							),
							moduleName,
							app.utils.Level.DEBUG
						);

						var query = connection.query('SELECT * FROM data WHERE id BETWEEN ? AND ?', resultScope, function(error, result) {
							if(error) {
								app.utils.log(
									sprintf(
										"%s\n%s %s",
										chalk.red("Cannot get enries from MySQL!"),
										chalk.red("Error: "),
										chalk.keyword('orange').bold(error)
									),
									app.utils.Level.ERROR
								);
								return reject(JSON.stringify({
									error: true,
									code: ResponseCode.getValue(ResponseCode.PushedData),
									error_object: {
										errno: error.errno,
										message: error.message,
										name: error.name,
										sql: error.sql
									},
									client: client
								}));
							}

							app.utils.log(
								sprintf(
									"%s",
									chalk.blue("MySQL request is successfull! (Get entries)")
								),
								moduleName,
								app.utils.Level.DEBUG
							);

							var resultJson = [];
							var now = 0;
							result.forEach(function(row) {
								resultJson[now] = {
									id: row.id,
									json: JSON.parse(row.json)
								};
								now++;
								console.log("Entry: ", row);
							});
							var resultWrapped = JSON.stringify(resultJson);
							console.log("resultWrapped: ", resultWrapped);
						});
					});

					return resolve(JSON.stringify({
						error: false,
						code: ResponseCode.PushedData.value,
						client: client
					}));
				},
				error => {
					return;
				}
			);
		});
	};

	/* Config operations */

	this.setConfig = function(json, client) {
		return new Promise(function(resolve, reject) {
			main.validate(json, scheme_setConfig).then(
				value => {
					fs.readFile('./data/config.json', 'utf8').then(
						contents => {
							main.parseJSON(contents, true).then(
								result => {
									var sidedConfig = result[value.side];
									return resolve(JSON.stringify({
										error: false,
										code: ResponseCode.GotConfig.value,
										config: sidedConfig,
										client: client
									}));
								},
								error => {
									return reject(JSON.stringify({
										error: true,
										code: ResponseCode.GotConfig.value,
										error_object: {
											type: Errors.JsonParseError.value,
											name: error.name,
											message: error.message
										},
										client: client
									}));
								}
							);
						},
						error => {
							return reject(JSON.stringify({
								error: true,
								code: ResponseCode.GotConfig.value,
								error_object: {
									type: Errors.FileReadError.value,
									name: error.name,
									message: error.message
								},
								client: client
							}));
						}
					)
				},
				error => {
					return reject(JSON.stringify({
						error: true,
						code: ResponseCode.GotConfig.value,
						error_object: {
							type: Errors.JsonValidationError.value,
							name: error.name,
							message: error.message
						},
						client: client
					}));
				}
			);
		});
	};

	this.getConfig = function(json, client) {
		return new Promise(function(resolve, reject) {
			main.validate(json, scheme_getConfig).then(
				value => {
					fs.readFile('./data/config.json', 'utf8').then(
						contents => {
							main.parseJSON(contents, true).then(
								result => {
									var sidedConfig = result[value.side];
									return resolve(JSON.stringify({
										error: false,
										code: ResponseCode.GotConfig.value,
										config: sidedConfig,
										client: client
									}));
								},
								error => {
									return reject(JSON.stringify({
										error: true,
										code: ResponseCode.GotConfig.value,
										error_object: {
											type: Errors.JsonParseError.value,
											name: error.name,
											message: error.message
										},
										client: client
									}));
								}
							);
						},
						error => {
							return reject(JSON.stringify({
								error: true,
								code: ResponseCode.GotConfig.value,
								error_object: {
									type: Errors.FileReadError.value,
									name: error.name,
									message: error.message
								},
								client: client
							}));
						}
					)
				},
				error => {
					return reject(JSON.stringify({
						error: true,
						code: ResponseCode.GotConfig.value,
						error_object: {
							type: Errors.JsonValidationError.value,
							name: error.name,
							message: error.message
						},
						client: client
					}));
				}
			);
		});
	};

	this.close = function() {
		app.utils.log(
			sprintf(
				"%s %s %s",
				chalk.yellow("Closing"),
				chalk.yellow.bold("MySQL"),
				chalk.yellow("connection...")
			),
			moduleName,
			app.utils.Level.INFO
		);
		connection.end();
	};
}