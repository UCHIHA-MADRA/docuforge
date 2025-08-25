import { PrismaClient } from "@prisma/client";

declare const process: {
  exit: (code?: number) => never;
};

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: "john.doe@example.com" },
    update: {},
    create: {
      email: "john.doe@example.com",
      name: "John Doe",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "jane.smith@example.com" },
    update: {},
    create: {
      email: "jane.smith@example.com",
      name: "Jane Smith",
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    },
  });

  // Create sample organization
  const organization = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      description: "A leading technology company",
    },
  });

  // Add users to organization with members
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user1.id,
      role: "OWNER",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user2.id,
      role: "ADMIN",
    },
  });

  // Create sample documents
  const document1 = await prisma.document.create({
    data: {
      title: "Project Proposal 2024",
      content:
        "This is a comprehensive project proposal for the upcoming year...",
      status: "DRAFT",
      visibility: "ORGANIZATION",
      userId: user1.id,
      organizationId: organization.id,
      wordCount: 1500,
      readingTime: 6,
    },
  });

  const document2 = await prisma.document.create({
    data: {
      title: "Team Meeting Notes",
      content: "Key points from our weekly team meeting...",
      status: "PUBLISHED",
      visibility: "ORGANIZATION",
      userId: user2.id,
      organizationId: organization.id,
      wordCount: 800,
      readingTime: 3,
    },
  });

  // Create sample files
  const file1 = await prisma.file.create({
    data: {
      name: "presentation.pdf",
      filename: "presentation.pdf",
      originalName: "presentation.pdf",
      mimeType: "application/pdf",
      size: 2048576,
      path: "/uploads/presentations/presentation.pdf",
      encryptedMetadata: "{}",
      uploadedBy: user1.id,
      userId: user1.id,
      processingStatus: "COMPLETED",
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
  });

  const file2 = await prisma.file.create({
    data: {
      name: "image.jpg",
      filename: "image.jpg",
      originalName: "team-photo.jpg",
      mimeType: "image/jpeg",
      size: 1048576,
      path: "/uploads/images/image.jpg",
      encryptedMetadata: "{}",
      uploadedBy: user2.id,
      userId: user2.id,
      processingStatus: "COMPLETED",
      checksum: "f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650",
    },
  });

  // Link files to documents
  await prisma.document.update({
    where: { id: document1.id },
    data: {
      fileId: file1.id,
    },
  });

  await prisma.document.update({
    where: { id: document2.id },
    data: {
      fileId: file2.id,
    },
  });

  // Create sample tags
  const tag1 = await prisma.tag.upsert({
    where: { name: "proposal" },
    update: {},
    create: {
      name: "proposal",
      color: "#3B82F6",
    },
  });

  const tag2 = await prisma.tag.upsert({
    where: { name: "meeting" },
    update: {},
    create: {
      name: "meeting",
      color: "#10B981",
    },
  });

  // Link tags to documents
  await prisma.document.update({
    where: { id: document1.id },
    data: {
      tags: {
        connect: [{ id: tag1.id }],
      },
    },
  });

  await prisma.document.update({
    where: { id: document2.id },
    data: {
      tags: {
        connect: [{ id: tag2.id }],
      },
    },
  });

  // Create sample comments
  await prisma.comment.create({
    data: {
      content:
        "Great proposal! I think we should add more details about the timeline.",
      authorId: user2.id,
      documentId: document1.id,
    },
  });

  // Create user preferences
  await prisma.userPreferences.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      theme: "light",
      language: "en",
      timezone: "America/New_York",
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      theme: "dark",
      language: "en",
      timezone: "Europe/London",
    },
  });

  // Create sample analytics events
  await prisma.analyticsEvent.create({
    data: {
      userId: user1.id,
      event: "document_create",
      category: "document",
      metadata: {
        documentId: document1.id,
        documentTitle: "Project Proposal 2024",
      },
    },
  });

  await prisma.analyticsEvent.create({
    data: {
      userId: user2.id,
      event: "file_upload",
      category: "file",
      metadata: {
        fileId: file2.id,
        fileName: "team-photo.jpg",
        fileSize: 1048576,
        mimeType: "image/jpeg",
      },
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log(`👥 Created ${2} users`);
  console.log(`🏢 Created ${1} organization`);
  console.log(`📄 Created ${2} documents`);
  console.log(`📁 Created ${2} files`);
  console.log(`🏷️  Created ${2} tags`);
  console.log(`💬 Created ${1} comment`);
  console.log(`📊 Created ${2} analytics events`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });