import prisma from "../../prisma/client.js";

// GET /api/holidays?year=2025
export const getHolidays = async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59),
      },
    },
    orderBy: { date: "asc" },
  });
  res.json(holidays);
};

// POST /api/holidays
export const createHoliday = async (req, res) => {
  const { name, date, type, description } = req.body;
  if (!name || !date) return res.status(400).json({ message: "name and date are required" });

  const d = new Date(date);
  d.setHours(12, 0, 0, 0); // store at noon to avoid TZ shifts

  try {
    const holiday = await prisma.holiday.create({
      data: { name, date: d, type: type || "PUBLIC", description: description || null },
    });
    res.status(201).json({ message: "Holiday created", holiday });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ message: "A holiday already exists on this date" });
    throw err;
  }
};

// PUT /api/holidays/:id
export const updateHoliday = async (req, res) => {
  const { name, date, type, description } = req.body;
  const data = {};
  if (name) data.name = name;
  if (date) { const d = new Date(date); d.setHours(12, 0, 0, 0); data.date = d; }
  if (type) data.type = type;
  if (description !== undefined) data.description = description || null;

  try {
    const holiday = await prisma.holiday.update({ where: { id: parseInt(req.params.id) }, data });
    res.json({ message: "Holiday updated", holiday });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Holiday not found" });
    if (err.code === "P2002") return res.status(409).json({ message: "A holiday already exists on this date" });
    throw err;
  }
};

// DELETE /api/holidays/:id
export const deleteHoliday = async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Holiday deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Holiday not found" });
    throw err;
  }
};

// POST /api/holidays/bulk  — import multiple at once
export const bulkCreateHolidays = async (req, res) => {
  const { holidays } = req.body;
  if (!Array.isArray(holidays) || holidays.length === 0)
    return res.status(400).json({ message: "holidays array required" });

  const data = holidays.map((h) => {
    const d = new Date(h.date);
    d.setHours(12, 0, 0, 0);
    return { name: h.name, date: d, type: h.type || "PUBLIC", description: h.description || null };
  });

  const result = await prisma.holiday.createMany({ data, skipDuplicates: true });
  res.json({ message: `${result.count} holidays imported`, count: result.count });
};
