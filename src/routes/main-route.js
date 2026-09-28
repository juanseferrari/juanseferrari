var express = require('express');
var router = express.Router();


const mainController = require('../controllers/main-controller');
const weightController = require('../controllers/weight-controller');
const trainingRoute = require('./training-route');


/* Tiendanube */
router.get('/', mainController.home);

router.get('/trabajo', mainController.trabajo);
router.get('/agendar', mainController.agenda);
router.get('/pay', mainController.pay);
router.get('/pay/:amount', mainController.pay);

/* Training 70.3: calendario, Strava y overrides */
router.use('/', trainingRoute);

router.get('/weight/new', weightController.new);
router.post('/weight/new', weightController.create);



module.exports = router;