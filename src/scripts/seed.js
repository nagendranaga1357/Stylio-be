import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/User.js';
import { City, Area } from '../models/Location.js';
import Salon from '../models/Salon.js';
import { ServiceCategory, ServiceType, Service } from '../models/Service.js';
import ServiceProvider from '../models/Provider.js';
import { Short } from '../models/Short.js';

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
        name: 'Rajesh Sharma',
        salon: styleStudio._id,
        phone: '9876543210',
        specializations: ['Haircut', 'Hair Styling', 'Hair Coloring'],
        specialization: 'haircut', // Legacy field
        audience: ['men', 'women', 'kids'],
        experienceYears: 8,
        experience: 8,
        bio: 'Expert hair stylist with 8 years of experience in premium salons',
        averageRating: 4.6,
        rating: 4.6,
        totalReviews: 89,
        reviewCount: 89,
        gallery: [
          'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
        ],
        services: [
          { name: "Men's Haircut", price: 300, duration: 30 },
          { name: "Women's Haircut", price: 500, duration: 45 },
          { name: 'Hair Coloring', price: 1500, duration: 120 },
        ],
        location: {
          type: 'Point',
          coordinates: [72.8561, 19.1136],
        },
        city: mumbai._id,
        area: andheri._id,
        isAvailable: true,
        isActive: true,
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
        name: 'Priya Mehta',
        salon: glamAtHome._id,
        phone: '9876543220',
        specializations: ['Makeup', 'Bridal', 'Facial'],
        specialization: 'makeup', // Legacy field
        audience: ['women'],
        experienceYears: 5,
        experience: 5,
        bio: 'Celebrity makeup artist specializing in bridal and party makeup',
        averageRating: 4.9,
        rating: 4.9,
        totalReviews: 156,
        reviewCount: 156,
        gallery: [
          'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
        ],
        services: [
          { name: 'Party Makeup', price: 2500, duration: 90 },
          { name: 'Bridal Makeup', price: 15000, duration: 180 },
          { name: 'Facial at Home', price: 1200, duration: 60 },
        ],
        providesHomeService: true,
        homeServiceAreas: [bandra._id, andheri._id],
        homeServiceFee: 200,
        location: {
          type: 'Point',
          coordinates: [72.8296, 19.0544],
        },
        city: mumbai._id,
        area: bandra._id,
        isAvailable: true,
        isActive: true,
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

    // Create a third provider for the men's barbershop
    let provider3 = await ServiceProvider.findOne({ salon: gentsCut._id });
    if (!provider3) {
      // First create a user for this provider
      let barberUser = await User.findOne({ username: 'barber' });
      if (!barberUser) {
        barberUser = await User.create({
          username: 'barber',
          email: 'barber@gentscut.com',
          password: 'barber1234',
          firstName: 'Vikram',
          lastName: 'Singh',
          phone: '9876543240',
          role: 'provider',
          isActive: true,
          isEmailVerified: true,
        });
      }

      provider3 = await ServiceProvider.create({
        user: barberUser._id,
        name: 'Vikram Singh',
        salon: gentsCut._id,
        phone: '9876543240',
        specializations: ['Haircut', 'Beard Styling'],
        specialization: 'haircut',
        audience: ['men'],
        experienceYears: 12,
        experience: 12,
        bio: 'Master barber with 12 years experience in classic and modern cuts',
        averageRating: 4.7,
        rating: 4.7,
        totalReviews: 234,
        reviewCount: 234,
        gallery: [
          'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
          'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400',
        ],
        services: [
          { name: 'Classic Haircut', price: 250, duration: 30 },
          { name: 'Beard Styling', price: 200, duration: 20 },
          { name: 'Hair + Beard Combo', price: 400, duration: 45 },
        ],
        providesHomeService: true,
        homeServiceAreas: [koramangala._id],
        homeServiceFee: 150,
        location: {
          type: 'Point',
          coordinates: [77.6245, 12.9352],
        },
        city: bangalore._id,
        area: koramangala._id,
        isAvailable: true,
        isActive: true,
        isVerified: true,
        availability: [
          { dayOfWeek: 0, startTime: '10:00', endTime: '20:00', isAvailable: false },
          { dayOfWeek: 1, startTime: '10:00', endTime: '20:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '10:00', endTime: '20:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '10:00', endTime: '20:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '10:00', endTime: '20:00', isAvailable: true },
          { dayOfWeek: 5, startTime: '10:00', endTime: '21:00', isAvailable: true },
          { dayOfWeek: 6, startTime: '10:00', endTime: '21:00', isAvailable: true },
        ],
      });
      console.log('✅ Service provider created for Gents Cut');
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
    // SHORTS (V1 Reels/TikTok style content)
    // =====================

    // Sample MP4 video URLs (public domain / sample videos)
    // In production, these would be your own CDN-hosted videos
    const SAMPLE_VIDEOS = [
      'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    ];

    const shortsData = [
      {
        title: 'Perfect Fade Haircut Tutorial 💈',
        description: 'Master the art of the perfect fade! Watch and learn from a pro barber. #barbering #haircut #fade',
        thumbnail: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
        videoUrl: SAMPLE_VIDEOS[0],
        platform: 'local',
        duration: '0:45',
        category: 'haircut',
        music: 'Original Sound - BarberPro',
        creator: { name: 'BarberPro Academy', username: '@barberpro', avatar: 'https://i.pravatar.cc/150?u=barber1', verified: true, followers: '1.2M' },
        tags: ['#haircut', '#fade', '#barbering', '#grooming'],
        viewCount: 2340000,
        likeCount: 89000,
        commentCount: 1200,
        shareCount: 5600,
        salon: styleStudio._id,
      },
      {
        title: 'Bridal Makeup Transformation ✨',
        description: 'Watch this stunning bridal makeup transformation! From bare face to gorgeous bride. #bridal #makeup #wedding',
        thumbnail: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
        videoUrl: SAMPLE_VIDEOS[1],
        platform: 'local',
        duration: '1:24',
        category: 'bridal',
        music: 'Wedding Day - Romantic Music',
        creator: { name: 'Glam Studio', username: '@glamstudio', avatar: 'https://i.pravatar.cc/150?u=glam1', verified: true, followers: '1.2M' },
        tags: ['#bridal', '#makeup', '#wedding', '#transformation'],
        viewCount: 5600000,
        likeCount: 234000,
        commentCount: 8900,
        shareCount: 45000,
        salon: glamAtHome._id,
      },
      {
        title: 'Beard Grooming Tips for Men 🧔',
        description: 'Top 5 beard grooming tips every man should know. Perfect your beard game! #beard #grooming #men',
        thumbnail: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400',
        videoUrl: SAMPLE_VIDEOS[2],
        platform: 'local',
        duration: '0:45',
        category: 'grooming',
        music: 'Gentleman\'s Guide - Beats',
        creator: { name: 'Gents Corner', username: '@gentscorner', avatar: 'https://i.pravatar.cc/150?u=gents1', verified: true, followers: '567K' },
        tags: ['#beard', '#grooming', '#men', '#tips'],
        viewCount: 1890000,
        likeCount: 67000,
        commentCount: 890,
        shareCount: 3400,
        salon: gentsCut._id,
      },
      {
        title: 'Nail Art Design Ideas 2024 💅',
        description: 'Trending nail art designs for 2024! Which one is your favorite? Comment below! #nailart #nails #trend',
        thumbnail: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400',
        videoUrl: SAMPLE_VIDEOS[3],
        platform: 'local',
        duration: '0:38',
        category: 'nailart',
        music: 'Pretty Nails - Pop',
        creator: { name: 'Nail Queen', username: '@nailqueen', avatar: 'https://i.pravatar.cc/150?u=nail1', verified: false, followers: '89K' },
        tags: ['#nailart', '#nails', '#trend', '#design'],
        viewCount: 890000,
        likeCount: 45000,
        commentCount: 560,
        shareCount: 2100,
        salon: glamAtHome._id,
      },
      {
        title: 'Hair Color Transformation 😍',
        description: 'From brunette to blonde in one session! Amazing hair color transformation. #haircolor #transformation #blonde',
        thumbnail: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
        videoUrl: SAMPLE_VIDEOS[4],
        platform: 'local',
        duration: '1:12',
        category: 'haircolor',
        music: 'Glow Up - Electronic',
        creator: { name: 'Color Masters', username: '@colormasters', avatar: 'https://i.pravatar.cc/150?u=color1', verified: true, followers: '890K' },
        tags: ['#haircolor', '#transformation', '#blonde', '#hair'],
        viewCount: 3450000,
        likeCount: 156000,
        commentCount: 4500,
        shareCount: 12000,
        salon: styleStudio._id,
      },
      {
        title: 'Facial Glow Up Routine ✨',
        description: 'My 10-minute facial routine for glowing skin. Glass skin goals! #skincare #facial #glow',
        thumbnail: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400',
        videoUrl: SAMPLE_VIDEOS[5],
        platform: 'local',
        duration: '0:52',
        category: 'skincare',
        music: 'Relaxing Spa - Ambient',
        creator: { name: 'Skin Expert', username: '@skinexpert', avatar: 'https://i.pravatar.cc/150?u=skin1', verified: true, followers: '456K' },
        tags: ['#skincare', '#facial', '#glow', '#routine'],
        viewCount: 1230000,
        likeCount: 78000,
        commentCount: 1200,
        shareCount: 5600,
        salon: glamAtHome._id,
      },
      {
        title: 'Classic Pompadour Tutorial 💈',
        description: 'How to style a classic pompadour at home. Step-by-step guide! #pompadour #hairstyle #classic',
        thumbnail: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
        videoUrl: SAMPLE_VIDEOS[0],
        platform: 'local',
        duration: '1:05',
        category: 'hairstyle',
        music: 'Retro Vibes - Jazz',
        creator: { name: 'Style Pro', username: '@stylepro', avatar: 'https://i.pravatar.cc/150?u=style1', verified: false, followers: '234K' },
        tags: ['#pompadour', '#hairstyle', '#classic', '#tutorial'],
        viewCount: 980000,
        likeCount: 34000,
        commentCount: 450,
        shareCount: 1800,
        salon: gentsCut._id,
      },
      {
        title: 'Party Makeup Look 🎉',
        description: 'Glamorous party makeup tutorial. Get ready with me for a night out! #partymakeup #glam #tutorial',
        thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
        videoUrl: SAMPLE_VIDEOS[1],
        platform: 'local',
        duration: '0:48',
        category: 'makeup',
        music: 'Party Night - Dance',
        creator: { name: 'Makeup Magic', username: '@makeupmagic', avatar: 'https://i.pravatar.cc/150?u=makeup1', verified: true, followers: '1.8M' },
        tags: ['#partymakeup', '#glam', '#tutorial', '#makeup'],
        viewCount: 4500000,
        likeCount: 198000,
        commentCount: 6700,
        shareCount: 23000,
        salon: glamAtHome._id,
      },
      {
        title: 'Relaxing Spa Day Experience 🧖‍♀️',
        description: 'Join me for a relaxing spa day! Full body treatment and wellness routine. #spa #wellness #relaxation',
        thumbnail: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
        videoUrl: SAMPLE_VIDEOS[2],
        platform: 'local',
        duration: '1:30',
        category: 'spa',
        music: 'Zen Garden - Meditation',
        creator: { name: 'Wellness Guru', username: '@wellnessguru', avatar: 'https://i.pravatar.cc/150?u=wellness1', verified: true, followers: '678K' },
        tags: ['#spa', '#wellness', '#relaxation', '#selfcare'],
        viewCount: 1560000,
        likeCount: 87000,
        commentCount: 980,
        shareCount: 4200,
        salon: glamAtHome._id,
      },
      {
        title: 'Before & After Makeover 🌟',
        description: 'Amazing complete makeover transformation! Hair, makeup, and style. #transformation #makeover #beauty',
        thumbnail: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
        videoUrl: SAMPLE_VIDEOS[3],
        platform: 'local',
        duration: '1:15',
        category: 'transformation',
        music: 'New Me - Inspirational',
        creator: { name: 'Beauty Boss', username: '@beautyboss', avatar: 'https://i.pravatar.cc/150?u=beauty1', verified: true, followers: '2.1M' },
        tags: ['#transformation', '#makeover', '#beauty', '#glow'],
        viewCount: 6780000,
        likeCount: 345000,
        commentCount: 12000,
        shareCount: 56000,
        salon: styleStudio._id,
      },
    ];

    for (const shortData of shortsData) {
      const existingShort = await Short.findOne({ title: shortData.title });
      if (!existingShort) {
        await Short.create({
          ...shortData,
          isActive: true,
          isFeatured: shortData.viewCount > 2000000,
          isVerified: shortData.creator.verified,
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
        });
        console.log('✅ Short created:', shortData.title);
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
    console.log('\n🎬 Test Shorts/Reels:');
    console.log('   - 8 sample shorts with YouTube/Instagram links');
    console.log('   - Categories: haircut, makeup, beard, nail, skincare, bridal');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedDatabase();
