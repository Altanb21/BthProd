"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var _require = require('express'),
    Router = _require.Router;

var router = Router();

var _require2 = require("socket.io"),
    Server = _require2.Server;

var io = new Server(server);

var sendMessage = require('../vendor/sendMessage');

var Massage = require('../models/message'); // /chat/


router.post('/', function _callee(req, res) {
  var _req$data, user, text, error;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          try {
            _req$data = req.data, user = _req$data.user, text = _req$data.text;
            io.on('connection', function (socet) {
              var thisDate = new Date();
              var thisMonth = thisDate.getMonth();
              var thisDay = thisDate.getDay();
              var thisYear = thisDate.getYear();
              var messages = Massage.find({
                date: "".concat(thisDay, ".").concat(thisMonth, ".").concat(thisYear)
              }).pretty();
              io.emit('chat messages', {
                messages: messages
              });
            });
            io.on('sendMessage', function (socet) {
              var dataMessage = {
                sender: user,
                senderStatus: 'User',
                text: text,
                date: new Date()
              };
              sendMessage.apply(void 0, _toConsumableArray(dataMessage));
            });
          } catch (e) {
            error = e;
            res.status(501).json({
              message: 'Что-то пошло не так, попробуйте снова',
              error: "\u0414\u0435\u0442\u0430\u043B\u0438: ".concat(error)
            });
          }

        case 1:
        case "end":
          return _context.stop();
      }
    }
  });
});
module.exports = router;