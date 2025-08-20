const contactController = require('../controllers/contactController');

router.use(authMiddleware);

router.post('/', contactController.addContact); // Ajouter un contact
router.get('/', contactController.getContacts); // Lister les contacts
router.delete('/:contactId', contactController.deleteContact); // Supprimer un contact
