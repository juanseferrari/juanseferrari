var express = require('express');
var router = express.Router();


const mainController = require('../controllers/main-controller');


/* Tiendanube */
router.get('/', mainController.home);

router.get('/trabajo', mainController.trabajo);
router.get('/agendar', mainController.agenda);



module.exports = router;