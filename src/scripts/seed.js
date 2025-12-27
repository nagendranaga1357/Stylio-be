import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/User.js';
import { City, Area } from '../models/Location.js';
import Salon from '../models/Salon.js';
import { ServiceCategory, ServiceType, Service } from '../models/Service.js';
import ServiceProvider from '../models/Provider.js';

/**
 * V1 Database Seed Script
 * 
 * Creates test data with the new V1 fields:
 * - mode (toSalon, toHome, both)
 * - audience (men, women, kids, unisex)
 * - priceLevel, averageRating, popularityScore
 * - Tags for search
 */
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.db.uri);
    console.log('✅ Connected to MongoDB');

    // =====================
    // USERS
    // =====================
    
    // Create test customer user
    const existingUser = await User.findOne({ username: 'testuser' });
    if (!existingUser) {
      const testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'test1234',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        role: 'customer',
        isActive: true,
        isEmailVerified: true,
      });
      console.log('✅ Test user created:', testUser.username);
    } else {
      console.log('ℹ️  Test user already exists');
    }

    // Create salon owner user
    let ownerUser = await User.findOne({ username: 'salonowner' });
    if (!ownerUser) {
      ownerUser = await User.create({
        username: 'salonowner',
        email: 'owner@salon.com',
        password: 'owner1234',
        firstName: 'Salon',
        lastName: 'Owner',
        phone: '9876543210',
        role: 'provider',
        isActive: true,
        isEmailVerified: true,
      });
      console.log('✅ Salon owner user created');
    }

    // Create home service provider user
    let homeProviderUser = await User.findOne({ username: 'homeprovider' });
    if (!homeProviderUser) {
      homeProviderUser = await User.create({
        username: 'homeprovider',
        email: 'home@provider.com',
        password: 'home1234',
        firstName: 'Home',
        lastName: 'Provider',
        phone: '9876543211',
        role: 'provider',
        isActive: true,
        isEmailVerified: true,
      });
      console.log('✅ Home provider user created');
    }

    // =====================
    // LOCATIONS
    // =====================

    // Create cities
    let mumbai = await City.findOne({ name: 'Mumbai' });
    if (!mumbai) {
      mumbai = await City.create({
        name: 'Mumbai',
        slug: 'mumbai',
        state: 'Maharashtra',
        center: { type: 'Point', coordinates: [72.8777, 19.0760] },
        isActive: true,
      });
      console.log('✅ City created:', mumbai.name);
    }

    let bangalore = await City.findOne({ name: 'Bangalore' });
    if (!bangalore) {
      bangalore = await City.create({
        name: 'Bangalore',
        slug: 'bangalore',
        state: 'Karnataka',
        center: { type: 'Point', coordinates: [77.5946, 12.9716] },
        isActive: true,
      });
      console.log('✅ City created:', bangalore.name);
    }

    // Create areas
    let andheri = await Area.findOne({ name: 'Andheri', city: mumbai._id });
    if (!andheri) {
      andheri = await Area.create({
        name: 'Andheri',
        slug: 'andheri',
        city: mumbai._id,
        pincode: '400053',
        center: { type: 'Point', coordinates: [72.8561, 19.1136] },
        isActive: true,
      });
      console.log('✅ Area created:', andheri.name);
    }

    let bandra = await Area.findOne({ name: 'Bandra', city: mumbai._id });
    if (!bandra) {
      bandra = await Area.create({
        name: 'Bandra',
        slug: 'bandra',
        city: mumbai._id,
        pincode: '400050',
        center: { type: 'Point', coordinates: [72.8296, 19.0544] },
        isActive: true,
      });
      console.log('✅ Area created:', bandra.name);
    }

    let koramangala = await Area.findOne({ name: 'Koramangala', city: bangalore._id });
    if (!koramangala) {
      koramangala = await Area.create({
        name: 'Koramangala',
        slug: 'koramangala',
        city: bangalore._id,
        pincode: '560034',
        center: { type: 'Point', coordinates: [77.6245, 12.9352] },
        isActive: true,
      });
      console.log('✅ Area created:', koramangala.name);
    }

    // =====================
    // SERVICE CATEGORIES & TYPES
    // =====================

    // Hair Care category
    let hairCategory = await ServiceCategory.findOne({ name: 'Hair Care' });
    if (!hairCategory) {
      hairCategory = await ServiceCategory.create({
        name: 'Hair Care',
        slug: 'hair-care',
        icon: 'cut',
        description: 'All hair care services including cuts, coloring, and treatments',
        order: 1,
        isActive: true,
      });
      console.log('✅ Category created:', hairCategory.name);
    }

    // Skin Care category
    let skinCategory = await ServiceCategory.findOne({ name: 'Skin Care' });
    if (!skinCategory) {
      skinCategory = await ServiceCategory.create({
        name: 'Skin Care',
        slug: 'skin-care',
        icon: 'sparkles',
        description: 'Facials, cleanups, and skin treatments',
        order: 2,
        isActive: true,
      });
      console.log('✅ Category created:', skinCategory.name);
    }

    // Nail Care category
    let nailCategory = await ServiceCategory.findOne({ name: 'Nail Care' });
    if (!nailCategory) {
      nailCategory = await ServiceCategory.create({
        name: 'Nail Care',
        slug: 'nail-care',
        icon: 'hand-raised',
        description: 'Manicure, pedicure, and nail art',
        order: 3,
        isActive: true,
      });
      console.log('✅ Category created:', nailCategory.name);
    }

    // Service types
    let haircutType = await ServiceType.findOne({ slug: 'haircut' });
    if (!haircutType) {
      haircutType = await ServiceType.create({
        name: 'Haircut',
        slug: 'haircut',
        category: hairCategory._id,
        description: 'Professional haircut services',
        isActive: true,
      });
      console.log('✅ Service type created:', haircutType.name);
    }

    let coloringType = await ServiceType.findOne({ slug: 'hair-coloring' });
    if (!coloringType) {
      coloringType = await ServiceType.create({
        name: 'Hair Coloring',
        slug: 'hair-coloring',
        category: hairCategory._id,
        description: 'Hair coloring and highlights',
        isActive: true,
      });
      console.log('✅ Service type created:', coloringType.name);
    }

    let facialType = await ServiceType.findOne({ slug: 'facial' });
    if (!facialType) {
      facialType = await ServiceType.create({
        name: 'Facial',
        slug: 'facial',
        category: skinCategory._id,
        description: 'Facial treatments and cleanups',
        isActive: true,
      });
      console.log('✅ Service type created:', facialType.name);
    }

    let manicureType = await ServiceType.findOne({ slug: 'manicure' });
    if (!manicureType) {
      manicureType = await ServiceType.create({
        name: 'Manicure',
        slug: 'manicure',
        category: nailCategory._id,
        description: 'Manicure and nail care',
        isActive: true,
      });
      console.log('✅ Service type created:', manicureType.name);
    }

    // =====================
    // SALONS (V1 with mode, audience, etc.)
    // =====================

    // Salon 1: To Salon only (unisex)
    let styleStudio = await Salon.findOne({ name: 'Style Studio' });
    if (!styleStudio) {
      styleStudio = await Salon.create({
        name: 'Style Studio',
        slug: 'style-studio',
        email: 'contact@stylestudio.com',
        phone: '9876543210',
        mobile: '9876543211',
        description: 'Premium salon offering the best hair and beauty services',
        mode: 'toSalon',
        audience: ['men', 'women', 'kids'],
        area: andheri._id,
        city: mumbai._id,
        address: '123 Fashion Street, Near Metro Station, Andheri, Mumbai 400053',
        location: {
          type: 'Point',
          coordinates: [72.8561, 19.1136],
        },
        tags: ['premium', 'unisex', 'haircut', 'styling', 'family'],
        openingTime: '09:00',
        closingTime: '21:00',
        isOpenSunday: true,
        coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
        galleryImages: [
          { image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', caption: 'Salon Interior' },
          { image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800', caption: 'Styling Area' },
        ],
        features: {
          hasWifi: true,
          hasAc: true,
          hasParking: true,
          acceptsCards: true,
          homeServiceAvailable: false,
        },
        averageRating: 4.5,
        rating: 4.5,
        totalReviews: 128,
        priceLevel: 3,
        popularityScore: 850,
        isActive: true,
        isVerified: true,
        owner: ownerUser._id,
      });
      console.log('✅ Salon created:', styleStudio.name);
    }

    // Salon 2: Home service only (women focused)
    let glamAtHome = await Salon.findOne({ name: 'Glam At Home' });
    if (!glamAtHome) {
      glamAtHome = await Salon.create({
        name: 'Glam At Home',
        slug: 'glam-at-home',
        email: 'book@glamathome.com',
        phone: '9876543220',
        description: 'Premium home beauty services for women',
        mode: 'toHome',
        audience: ['women'],
        area: bandra._id,
        city: mumbai._id,
        address: 'Bandra West, Mumbai',
        location: {
          type: 'Point',
          coordinates: [72.8296, 19.0544],
        },
        tags: ['home service', 'women', 'bridal', 'makeup', 'spa'],
        openingTime: '08:00',
        closingTime: '22:00',
        isOpenSunday: true,
        coverImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
        features: {
          hasWifi: false,
          hasAc: false,
          hasParking: false,
          acceptsCards: true,
          homeServiceAvailable: true,
        },
        averageRating: 4.8,
        rating: 4.8,
        totalReviews: 256,
        priceLevel: 4,
        popularityScore: 1200,
        isActive: true,
        isVerified: true,
        owner: homeProviderUser._id,
      });
      console.log('✅ Salon created:', glamAtHome.name);
    }

    // Salon 3: Both modes (men focused)
    let gentsCut = await Salon.findOne({ name: 'Gents Cut' });
    if (!gentsCut) {
      gentsCut = await Salon.create({
        name: 'Gents Cut',
        slug: 'gents-cut',
        email: 'book@gentscut.com',
        phone: '9876543230',
        description: 'Classic barbershop with home service option',
        mode: 'both',
        audience: ['men'],
        area: koramangala._id,
        city: bangalore._id,
        address: '4th Block, Koramangala, Bangalore',
        location: {
          type: 'Point',
          coordinates: [77.6245, 12.9352],
        },
        tags: ['barber', 'men', 'beard', 'grooming', 'classic'],
        openingTime: '10:00',
        closingTime: '20:00',
        isOpenSunday: false,
        coverImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
        features: {
          hasWifi: true,
          hasAc: true,
          hasParking: false,
          acceptsCards: true,
          homeServiceAvailable: true,
        },
        averageRating: 4.3,
        rating: 4.3,
        totalReviews: 89,
        priceLevel: 2,
        popularityScore: 650,
        isActive: true,
        isVerified: true,
      });
      console.log('✅ Salon created:', gentsCut.name);
    }

    // =====================
    // SERVICE PROVIDERS
    // =====================

    let provider1 = await ServiceProvider.findOne({ user: ownerUser._id });
    if (!provider1) {
      provider1 = await ServiceProvider.create({
        user: ownerUser._id,
        salon: styleStudio._id,
        phone: '9876543210',
        specialization: 'haircut',
        experienceYears: 8,
        bio: 'Expert hair stylist with 8 years of experience in premium salons',
        rating: 4.6,
        isAvailable: true,
        isVerified: true,
        availability: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '21:00', isAvailable: true },
          { dayOfWeek: 1, startTime: '09:00', endTime: '21:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '21:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '21:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '21:00', isAvailable: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '22:00', isAvailable: true },
          { dayOfWeek: 6, startTime: '10:00', endTime: '20:00', isAvailable: true },
        ],
      });
      console.log('✅ Service provider created for Style Studio');
    }

    let provider2 = await ServiceProvider.findOne({ user: homeProviderUser._id });
    if (!provider2) {
      provider2 = await ServiceProvider.create({
        user: homeProviderUser._id,
        salon: glamAtHome._id,
        phone: '9876543220',
        specialization: 'makeup',
        experienceYears: 5,
        bio: 'Celebrity makeup artist specializing in bridal and party makeup',
        rating: 4.9,
        isAvailable: true,
        isVerified: true,
        availability: [
          { dayOfWeek: 0, startTime: '08:00', endTime: '22:00', isAvailable: true },
          { dayOfWeek: 1, startTime: '08:00', endTime: '22:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '08:00', endTime: '22:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '08:00', endTime: '22:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '22:00', isAvailable: true },
          { dayOfWeek: 5, startTime: '08:00', endTime: '22:00', isAvailable: true },
          { dayOfWeek: 6, startTime: '08:00', endTime: '22:00', isAvailable: true },
        ],
      });
      console.log('✅ Service provider created for Glam At Home');
    }

    // =====================
    // SERVICES (V1 with mode, audience)
    // =====================

    const servicesData = [
      // Style Studio services (toSalon only, unisex)
      { name: "Men's Haircut", price: 300, duration: 30, salon: styleStudio, type: haircutType, mode: 'toSalon', audience: ['men'], popular: true },
      { name: "Women's Haircut", price: 500, duration: 45, salon: styleStudio, type: haircutType, mode: 'toSalon', audience: ['women'], popular: true },
      { name: "Kids Haircut", price: 200, duration: 20, salon: styleStudio, type: haircutType, mode: 'toSalon', audience: ['kids'], popular: false },
      { name: "Hair Coloring", price: 1500, duration: 120, salon: styleStudio, type: coloringType, mode: 'toSalon', audience: ['women', 'men'], popular: true },
      { name: "Hair Spa", price: 800, duration: 60, salon: styleStudio, type: haircutType, mode: 'toSalon', audience: ['women', 'men'], popular: false },
      { name: "Beard Trim", price: 150, duration: 15, salon: styleStudio, type: haircutType, mode: 'toSalon', audience: ['men'], popular: true },
      
      // Glam At Home services (toHome only, women focused)
      { name: "Party Makeup", price: 2500, duration: 90, salon: glamAtHome, type: facialType, mode: 'toHome', audience: ['women'], popular: true },
      { name: "Bridal Makeup", price: 15000, duration: 180, salon: glamAtHome, type: facialType, mode: 'toHome', audience: ['women'], popular: true },
      { name: "Facial at Home", price: 1200, duration: 60, salon: glamAtHome, type: facialType, mode: 'toHome', audience: ['women'], popular: false },
      { name: "Manicure at Home", price: 600, duration: 45, salon: glamAtHome, type: manicureType, mode: 'toHome', audience: ['women'], popular: true },
      { name: "Pedicure at Home", price: 800, duration: 60, salon: glamAtHome, type: manicureType, mode: 'toHome', audience: ['women'], popular: false },
      
      // Gents Cut services (both modes, men focused)
      { name: "Classic Haircut", price: 250, homePrice: 400, duration: 30, salon: gentsCut, type: haircutType, mode: 'both', audience: ['men'], popular: true },
      { name: "Beard Styling", price: 200, homePrice: 350, duration: 20, salon: gentsCut, type: haircutType, mode: 'both', audience: ['men'], popular: true },
      { name: "Hair + Beard Combo", price: 400, homePrice: 600, duration: 45, salon: gentsCut, type: haircutType, mode: 'both', audience: ['men'], popular: true },
      { name: "Head Massage", price: 300, homePrice: 450, duration: 30, salon: gentsCut, type: haircutType, mode: 'both', audience: ['men'], popular: false },
    ];

    for (const svc of servicesData) {
      const existingService = await Service.findOne({ name: svc.name, salon: svc.salon._id });
      if (!existingService) {
        await Service.create({
          name: svc.name,
          salon: svc.salon._id,
          serviceType: svc.type._id,
          price: svc.price,
          basePrice: svc.price,
          homeServicePrice: svc.homePrice || null,
          durationMinutes: svc.duration,
          description: `Professional ${svc.name.toLowerCase()} service`,
          mode: svc.mode,
          audience: svc.audience,
          tags: [svc.name.toLowerCase().split(' ')[0], ...svc.audience],
          isActive: true,
          isPopular: svc.popular,
          bookingCount: svc.popular ? Math.floor(Math.random() * 100) + 50 : Math.floor(Math.random() * 30),
        });
        console.log('✅ Service created:', svc.name);
      }
    }

    // =====================
    // SUCCESS OUTPUT
    // =====================

    console.log('\n🎉 V1 Database seeded successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Customer:');
    console.log('   - Username: testuser');
    console.log('   - Password: test1234');
    console.log('\n   Salon Owner:');
    console.log('   - Username: salonowner');
    console.log('   - Password: owner1234');
    console.log('\n   Home Provider:');
    console.log('   - Username: homeprovider');
    console.log('   - Password: home1234');
    console.log('\n📍 Test Locations:');
    console.log('   - Mumbai: Andheri (72.8561, 19.1136), Bandra (72.8296, 19.0544)');
    console.log('   - Bangalore: Koramangala (77.6245, 12.9352)');
    console.log('\n💇 Test Salons:');
    console.log('   - Style Studio (toSalon, unisex) - Andheri, Mumbai');
    console.log('   - Glam At Home (toHome, women) - Bandra, Mumbai');
    console.log('   - Gents Cut (both, men) - Koramangala, Bangalore');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedDatabase();
