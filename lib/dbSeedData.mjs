export async function runSchemaAndSeed(sql, hashPasswordSync, schemaSqlText) {
  const cleaned = schemaSqlText
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql.query(stmt, []);
  }

  const demoHash = hashPasswordSync('Demo@1234');

  const seedUsers = [
    {
      id: 'user-farmer-1',
      name: 'Sardar Gurpreet Singh',
      role: 'farmer',
      phone: '9872144520',
      email: 'gurpreet.singh@kisanmail.in',
      organization: 'Kisan Ekta Cooperative Sangrur',
      location: 'Dhuri Village, Sangrur, Punjab',
      lat: 30.3742,
      lng: 75.8712,
    },
    {
      id: 'user-buyer-1',
      name: 'Rajesh Mehra (Procurement Head)',
      role: 'buyer',
      phone: '9811287654',
      email: 'rajesh.mehra@greensourcebiomass.com',
      organization: 'GreenSource Bio-Energy Pellets Pvt Ltd',
      location: 'Samalkha Industrial Area, Panipat, Haryana',
      lat: 29.2384,
      lng: 76.9936,
    },
    {
      id: 'user-logistics-1',
      name: 'Harpreet "Happy" Logistics',
      role: 'logistics',
      phone: '9417233499',
      email: 'dispatch@khalasafreight.com',
      organization: 'Khalsa Agro Transport & Fleet Co.',
      location: 'GT Road Bypass, Karnal, Haryana',
      lat: 29.6857,
      lng: 76.9905,
    },
    {
      id: 'user-admin-1',
      name: 'Dr. Ananya Sharma',
      role: 'admin',
      phone: '9910023411',
      email: 'ananya.sharma@strawsync.gov.in',
      organization: 'StrawSync National Residue Liquidity Cell',
      location: 'New Delhi HQ',
      lat: 28.6139,
      lng: 77.209,
    },
  ];

  for (const u of seedUsers) {
    await sql`
      INSERT INTO users (
        id, name, phone, email, password_hash, role, organization, location, lat, lng, is_verified, account_status
      ) VALUES (
        ${u.id}, ${u.name}, ${u.phone}, ${u.email}, ${demoHash}, ${u.role},
        ${u.organization}, ${u.location}, ${u.lat}, ${u.lng}, TRUE, 'active'
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  const seedListings = [
    {
      id: 'list-101',
      farmerId: 'user-farmer-1',
      farmerName: 'Sardar Gurpreet Singh',
      farmerPhone: '+91 98721 44520',
      cropType: 'paddy',
      cropName: 'Paddy Straw (Parali PR-126)',
      qty: 46.0,
      gross: 56.0,
      price: 1650,
      acres: 35,
      moisture: 13.5,
      location: 'Dhuri Khurd',
      district: 'Sangrur',
      state: 'Punjab',
      lat: 30.3742,
      lng: 75.8712,
      notes: 'Baled using square baler. Dry straw stored on raised tarpaulin near link road.',
    },
    {
      id: 'list-102',
      farmerId: 'user-farmer-1',
      farmerName: 'Baldev Ram & Sons',
      farmerPhone: '+91 98884 12093',
      cropType: 'paddy',
      cropName: 'Basmati Paddy Straw',
      qty: 29.0,
      gross: 35.2,
      price: 1750,
      acres: 22,
      moisture: 14.0,
      location: 'Nissing',
      district: 'Karnal',
      state: 'Haryana',
      lat: 29.8242,
      lng: 76.8285,
      notes: 'Basmati residue, compact round bales (180kg each). 400m from state highway.',
    },
    {
      id: 'list-103',
      farmerId: 'user-farmer-1',
      farmerName: 'Kuldeep Gill',
      farmerPhone: '+91 98144 76521',
      cropType: 'wheat',
      cropName: 'Wheat Straw (Turi / Bhusa)',
      qty: 61.5,
      gross: 70.0,
      price: 2400,
      acres: 50,
      moisture: 10.0,
      location: 'Samrala',
      district: 'Ludhiana',
      state: 'Punjab',
      lat: 30.8335,
      lng: 76.1925,
      notes: 'Premium fodder and industrial co-firing grade bales.',
    },
  ];

  for (const l of seedListings) {
    await sql`
      INSERT INTO farmer_listings (
        id, farmer_id, farmer_name, farmer_phone, crop_type, crop_name, category,
        original_quantity, weight_unit, quantity_tonnes, estimated_gross_tonnes,
        price_per_unit, price_per_tonne, land_area, land_unit, land_area_acres,
        moisture_percentage, bale_type, quality_score, location, district, state,
        lat, lng, status, harvest_date, collection_start_date, pickup_deadline, instructions
      ) VALUES (
        ${l.id}, ${l.farmerId}, ${l.farmerName}, ${l.farmerPhone}, ${l.cropType}, ${l.cropName}, 'crop_residue',
        ${l.qty}, 'tonne', ${l.qty}, ${l.gross},
        ${l.price}, ${l.price}, ${l.acres}, 'acre', ${l.acres},
        ${l.moisture}, 'baled', 'A', ${l.location}, ${l.district}, ${l.state},
        ${l.lat}, ${l.lng}, 'verified', '2026-11-15', '2026-11-18', '2026-12-15', ${l.notes}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  await sql`
    INSERT INTO buyer_requests (
      id, buyer_id, buyer_name, company_name, contact_phone, crop_type,
      required_tonnes, fulfilled_tonnes, max_price_per_tonne, max_moisture_percentage,
      delivery_location, address, district, state, lat, lng, deadline_date, industry_type, status
    ) VALUES (
      'dem-201', 'user-buyer-1', 'Rajesh Mehra', 'GreenSource Bio-Energy Pellets Pvt Ltd', '+91 98112 87654', 'paddy',
      120.0, 45.0, 2350, 16.0,
      'Panipat, Haryana', 'Plot 44-46, Phase II Industrial Estate', 'Panipat', 'Haryana', 29.3909, 76.9635,
      '2026-12-25', 'Bio-Pellet Plant', 'active'
    )
    ON CONFLICT (id) DO NOTHING
  `;
}
