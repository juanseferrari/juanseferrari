var express = require('express');
var router = express.Router();


const mainController = require('../controllers/main-controller');
const weightController = require('../controllers/weight-controller');


/* Tiendanube */
router.get('/', mainController.home);

router.get('/trabajo', mainController.trabajo);
router.get('/agendar', mainController.agenda);
router.get('/training', mainController.training);
router.get('/pay', mainController.pay);
router.get('/pay/:amount', mainController.pay);

router.get('/weight/new', weightController.new);
router.post('/weight/new', weightController.create);



module.exports = router;