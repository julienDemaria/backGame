"use strict";

/* Mise en route de Mongo */
var MongoClient = require('mongodb').MongoClient;
const url = "mongodb+srv://admin:mongobd@cluster0-tc1ya.azure.mongodb.net/test?retryWrites=true&w=majority";
const dbName = 'gamedb';

/* Début Express */
/* crétion serveur et configuration pour qu'il écoute le port 2000 */
/* lorsque le port 2000 reçoit une demande, le serveur en sera informé et, selon la demande, des requêtes seront gérées */
var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/client/index.html');
});
app.get('/inscription', function(req, res){
	res.sendFile(__dirname + '/client/inscription.html');
});
app.use('/client', express.static(__dirname + '/client'));
/* Le client ne peut demander des fichiers que parmi les deux emplacements ci-dessus */

serv.listen(process.env.PORT || 2000); // écoute du port 2000 sur localhost ou du port sur heroku
console.log("Le serveur est démarré. Il écoute le port 2000.");
/* Fin Express */

/* Canvas */
var CANVAS_HEIGHT = 500;
var CANVAS_WIDTH = 500;
var PLAYER_WIDTH = 20;
var PLAYER_HEIGHT = 20;


var Game = function(){
	/* objet 'self' contenant les attributs */
	var self = {
		x: 250,
		y: 250,
		spdX: 0,
		spdY: 0,
		id: ""
	}
	/* méthodes d'objet */
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2)); // calcule la distance entre 'self' et le point donné en tant que paramètre
	}
	return self; // constructeur retourne l'objet 'self'
}

/* Catégorie de joueur */
var Player = function(id, username, score){
	var self = Game(); // la classe est héritée
	/* ajoute des attributs au joueur en plus des attributs de base */
	self.id = id;
	self.username = username;
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	self.hp = 400;
	self.isDead = false;
	self.score = score;
	
	var super_update = self.update; // récupère la fonction de mise à jour dans une variable (super_update)
	self.update = function(){ // Ecrase la fonction de mise à jour
		if(!self.isDead){
			self.updateSpd(); // Mise à jour de la vitesse du joueur
			super_update(); // appelle la fonction de mise à jour qui met à jour l'emplacement en fonction de la vitesse
			
			/* empêche le joueur de bouger au-delà des bords */
			if(self.x < PLAYER_WIDTH / 2) {
				self.x = PLAYER_WIDTH / 2;
			}
			if(self.x > CANVAS_WIDTH - PLAYER_WIDTH / 2) {
				self.x = CANVAS_WIDTH - PLAYER_WIDTH / 2;
			}
			if(self.y < PLAYER_HEIGHT / 2) {
				self.y = PLAYER_HEIGHT / 2;
			}
			if(self.y > CANVAS_HEIGHT - PLAYER_HEIGHT / 2) {
				self.y = CANVAS_HEIGHT - PLAYER_HEIGHT / 2;
			}
			
			/* les balles sont tirées lorsque le bouton de la souris est enfoncé */
			if(self.pressingAttack){
				console.log(self.mouseAngle)
				self.shootBullet(self.mouseAngle);
			}
			self.shootBullet = function(angle){
				var b = Bullet(self.id, angle);
				b.x = self.x; // La balle est créée à l'emplacement du joueur
				b.y = self.y;
			}
			
			/* mort */
			if(self.hp <= 0){
				self.isDead = true;
				self.x = 6666;
				self.y = 6666;
				setTimeout(function(){
					self.respawn(); // le joueur réapparaît 5 secondes après la mort
				},5000);
			}
		}
	}
	
	/* change la vitesse du joueur en fonction de la touche enfoncée */
	self.updateSpd = function(){
		/*  x  */
		if(self.pressingRight) {
			self.spdX = self.maxSpd;
		}
		else if(self.pressingLeft) {
			self.spdX = -self.maxSpd;
		}
		else {
			self.spdX = 0;
		}
		/* y */
		if (self.pressingUp) {
			self.spdY = -self.maxSpd;
		}
		else if (self.pressingDown) {
			self.spdY = self.maxSpd;
		}
		else { 
			self.spdY = 0;
		}
	}
	
	/* joueur respawn de manière aléatoire */
	self.respawn = function(){
		self.x = Math.floor(Math.random() * (CANVAS_WIDTH - PLAYER_WIDTH / 2)) + PLAYER_WIDTH / 2;
		self.y = Math.floor(Math.random() * (CANVAS_HEIGHT - PLAYER_HEIGHT / 2)) + PLAYER_HEIGHT / 2;
		self.hp = 400;
		self.isDead = false;
	}
	
	/* ajouter le score */
	self.upScore = function(){
		self.score = self.score + 100;
	}
	
	Player.list[id] = self; // Ajouter un joueur à la liste lors de la création
	return self;
}

/* liste de tous les joueurs (une seule liste de joueurs existe, commune à tous les joueurs) */
Player.list = {};

/* cette fonction est appelée lorsqu'un nouveau joueur se connecte au serveur */
Player.onConnect = function(socket, username){
	getScore(username, function(res){ // récupération du score utilisateur de la base de données
		var player = Player(socket.id, username, res); // Créer un nouveau joueur avec l'ancien score extrait du socket
		
		socket.on('keyPress', function(data){
			/* touche du clavier */
			if(data.inputId === 'left') {
				player.pressingLeft = data.state;
			}
			else if(data.inputId === 'right') {
				player.pressingRight = data.state;
			}
			else if(data.inputId === 'up') {
				player.pressingUp = data.state;
			}
			else if(data.inputId === 'down') {
				player.pressingDown = data.state;
			}
			
			/* le bouton de la souris est enfoncé */
			else if(data.inputId === 'attack')
				player.pressingAttack = data.state;
			
			/* déplace la souris */
			else if(data.inputId === 'mouseAngle') {
				player.mouseAngle = data.state;
			}
		});
	});
}

/* cette fonction est appelée lorsque le client se déconnecte */
Player.onDisconnect = function(socket){
	var player = Player.list[socket.id]; // chercher le joueur de la liste
	if(player != null){
		updateScore(player.username, player.score, function(res){ // mise à jour de la base de données des scores
			delete Player.list[socket.id]; // supprime le joueur de la liste
		});
	}
}

/* fonction de mise à jour */
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update(); // Mise à jour de l'emplacement du joueur
		pack.push({
			x: player.x,
			y: player.y,
			username: player.username,
			isdead: player.isDead,
			score: player.score
		});
	}
	return pack;
}

/* Balle */
var Bullet = function(parent, angle){
	var self = Game();
	self.id = Math.random();
	self.spdX = Math.cos(angle/180*Math.PI)*10;
	self.spdY = Math.sin(angle/180*Math.PI)*10;
	self.parent = parent; // propriétaire de la balle, qui est le joueur qui a tiré la balle
	self.timer = 0;
	self.toRemove = false;

	var super_update = self.update; // les mêmes mises à jour que dans 'Player'
	self.update = function(){
		if(self.timer++ > 100) {
			self.toRemove = true; // efface la balle après un certain temps
		}
		super_update();

		/* parcourt tous les joueurs et vérifie une distance inférieure à 32 */
		/* si ces conditions sont remplies => collision */
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 32 && self.parent !== p.id){ 
				p.hp = p.hp - 50; // soustrait de hp
					if(p.hp == 0){ // coup mortel, donne des points au tireur
						for(var j in Player.list){ // recherche le propriétaire de la balle (tireur) dans la liste et y ajoute un score
							var b = Player.list[j];
							if(self.parent === b.id){
								b.upScore();
							}
						}
					}
			self.toRemove = true;
			}
		}
	}
	Bullet.list[self.id] = self;
	return self;
}

/* liste de toutes les balles */
Bullet.list = {};

/* Fonction de mise à jour */
Bullet.update = function(){
	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove) {
			delete Bullet.list[i];
		}
		else {
			pack.push({
				x: bullet.x,
				y: bullet.y,
			});
		}
	}
	return pack;
}

/* Début socket.IO */
var io = require('socket.io')(serv, {});

var SOCKET_LIST = {};

var DEBUG = true;

/* Début requêtes mongo */
var isValidPassword = function(data,cb){
	 MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
	 	const db = client.db(dbName);
	 	const collection = db.collection('data');
	 	collection.find({username: data.username, password: data.password}).toArray(function(err, res){
			console.log('isValidPassword');
	 		if(res.length > 0) // correspondance trouvée dans la base (longueur de réponse > 0)
				cb(true);
	 		else
				cb(false);
	 	});
	 });
}
var isUsernameTaken = function(data,cb){
	 MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
         const db = client.db(dbName);
	 	const collection = db.collection('data');
	 	collection.find({username: data.username}, function(err, res){
	 		console.log('isUsernameTaken');
	 		if(res.length > 0) // correspondance trouvée dans la base (longueur de réponse > 0)
	 			cb(true);
	 		else
	 			cb(false);
	 	});
	 });
}
var addUser = function(data,cb){
	 MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
        const db = client.db(dbName);
	 	const collection = db.collection('data');
	 	collection.insertMany([{username: data.username, password: data.password, score: 0}], function(err, res){
	 		console.log('addUser');
	 		cb();
	 	});
	});
}
var getScore = function(username,cb){
	MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
        const db = client.db(dbName);
		const collection = db.collection('data');
		collection.find({username: username}, {score: 1}).next( function(err, doc){
			console.log('getscore');
			cb(doc.score);
		});
	});
}
var updateScore = function(username,score,cb){
	MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
        const db = client.db(dbName);
		const collection = db.collection('data');
		collection.updateMany({username: username, $set: {score: score}}, function(err, res){
			console.log('updateScore');
			cb();
		});
	});
}
var getHighscores = function(cb){
	MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
        const db = client.db(dbName);
		const collection = db.collection('data');
		collection.find({username: 1, score: 1}).sort({score: -1}).limit(5).toArray(function(err, res){
			console.log('getHighscores');
			cb(res);
		});
	});
}

/* cette fonction est appelée lorsqu'un nouveau client se connecte au serveur */
io.sockets.on('connection', function(socket){
	console.log('Client connecté.'); 
	socket.id = Math.random(); // sera assigné au hasard au client
	SOCKET_LIST[socket.id] = socket; // Ajoute l'identifiant à la liste des sockets
	
	/* cette fonction est appelée lorsque le client envoie un message concernant la connexion */
	socket.on('signIn',function(data){
		isValidPassword(data, function(res){ // Le message contiendra le nom d'utilisateur et le mot de passe sous forme de données, en vérifiant s'ils sont corrects
			if(res){
				Player.onConnect(socket, data.username);
				socket.emit('signInResponse', {success: true}); // Envoi d'un message au client à propos de la connexion réussie
			} else {
				socket.emit('signInResponse', {success: false});
			} 
		});
	});
	
	/* cette fonction est appelée lorsque le client envoie un message concernant l'enregistrement */
	socket.on('signUp',function(data){
		isUsernameTaken(data, function(res){ // Le message contiendra le nom d'utilisateur et le mot de passe sous forme de données, en vérifiant si l'utilisateur est déjà trouvé
			if(res){
				console.log('pris')
				socket.emit('signUpResponse', {success: false});
			} else {
				console.log('paspris')
				addUser(data, function(){
					socket.emit('signUpResponse', {success: true});
				});
			}
		});	
	});
	
	/* cette fonction est appelée lorsque le client se déconnecte */
	socket.on('disconnect', function(){
		delete SOCKET_LIST[socket.id]; // supprime le client déconnecté des listes
		Player.onDisconnect(socket);
	});
	
	/* cette fonction est appelée lorsque le client envoie un message à la discussion */
	socket.on('sendMsgToServer', function(data){
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat', data.playername + ': ' + data.message);
		}
	});
	
	/* cette fonction est appelée lorsque le client envoie une commande */
	socket.on('evalServer', function(data){
		if(!DEBUG) {
			return;
		}
		try {
			var res = eval(data); // débugage
		} catch(e) {
			res = e.message;
		}
		socket.emit('evalAnswer', res);
	});
	
	/* cette fonction est appelée lorsqu'un client envoie une demande de 'highscores */
	socket.on('highscore', function(){
		getHighscores(function(res){
			socket.emit('highscoreResponse', res); // envoie au client une table avec les 5 meilleurs noms de joueurs
		});
	});
	
});

/* en boucle sur tous les clients (30fps) */
setInterval(function(){
	var pack = {
		player: Player.update(),
		bullet: Bullet.update()
	}
	
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions', pack); // envoie un paquet à tous les clients à partir de nouveaux emplacements sous forme de message
	}	
},1000/30);
