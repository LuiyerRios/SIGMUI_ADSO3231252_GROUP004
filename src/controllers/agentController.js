// HU-006 / HU-007 · Agente de tránsito: verificar placa y emitir multa digital
import { validatePlateInput, validateFineInput, FINE_AMOUNT } from '../utils/agentRules.js';
import { formatCOP } from '../utils/paymentFormat.js';
import { getPlateStatus, issueFine } from '../services/agentService.js';

const SERVER_ERROR = 'The plate could not be verified right now. Check your connection and try again.';

// GET /agent/verify  (HU-006)
export const renderVerify = (req, res) => {
  res.render('HU-006', {
    title: 'Verify plate | SIGMUI',
    activeMenu: 'verify_plate',
    pageTitle: 'Verify plate',
    pageSubtitle: 'Check if a vehicle has an active parking payment',
    initialPlate: String(req.query.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  });
};

// GET /api/plates/:plate/status  (HU-006, rol agente)
export const plateStatus = async (req, res) => {
  const { value: plate, error } = validatePlateInput(req.params.plate);
  if (error) return res.status(400).json({ error });
  try {
    res.json(await getPlateStatus(plate));
  } catch (err) {
    console.error('Error checking plate (HU-006):', err);
    res.status(500).json({ error: SERVER_ERROR });
  }
};

// GET /agent/fines/new?plate=ABC123  (HU-007)
export const renderNewFine = async (req, res) => {
  const locals = {
    title: 'Digital fine | SIGMUI',
    activeMenu: 'new_fine',
    pageTitle: 'Digital fine',
    pageSubtitle: 'Issue a fine to a vehicle with an expired parking session',
    fineAmount: formatCOP(FINE_AMOUNT),
    info: null,
    error: null,
    plate: null
  };
  if (!req.query.plate) return res.render('HU-007', locals);

  const { value: plate, error } = validatePlateInput(req.query.plate);
  if (error) return res.render('HU-007', { ...locals, error });
  try {
    const info = await getPlateStatus(plate);
    res.render('HU-007', { ...locals, plate, info });
  } catch (err) {
    console.error('Error loading fine form (HU-007):', err);
    res.status(500).render('HU-007', { ...locals, plate, error: SERVER_ERROR });
  }
};

// POST /api/fines  (HU-007, rol agente)
export const createFine = async (req, res) => {
  const { value, error } = validateFineInput(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await issueFine({ ...value, agentId: req.session.user.id });
    if (result.error) return res.status(result.code).json({ error: result.error });
    res.status(201).json({ ...result, amountText: formatCOP(result.amount), message: `Fine ${result.fineNumber} issued.` });
  } catch (err) {
    console.error('Error issuing fine (HU-007):', err);
    res.status(500).json({ error: 'The fine could not be saved. Please try again.' });
  }
};
