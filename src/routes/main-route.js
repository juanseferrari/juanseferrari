var express = require('express');
var router = express.Router();


const mainController = require('../controllers/main-controller');


/* Tiendanube */
router.get('/', mainController.home);

router.get('/trabajo', mainController.trabajo);
router.get('/agendar', mainController.agenda);
router.get('/training', mainController.training);
router.get('/pay', mainController.pay);
router.get('/pay/:amount', mainController.pay);



module.exports = router;