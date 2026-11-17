
import type { UploadApiResponse } from 'cloudinary';
import { randomBytes } from 'node:crypto';
import type { Certificate } from '@prisma/client';
import { env } from '../../config/env.js';
import { cloudinary } from '../../config/cloudinary.js';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { canManageCourseContent, requireCourse } from '../courses/courseAccess.js';
import { createNotification } from '../notifications/notification.service.js';
import { generateCertificatePdf } from './certificatePdf.js';
import type { AuthenticatedUser } from '../../middleware/authenticate.js';
import type { IssueCertificateInput } from './certificate.validation.js';

const DEFAULT_ISSUING_BODY = 'Forge Loom';

export async function issueCertificate(
  enrollmentId: string,
  viewer: AuthenticatedUser,
  input: IssueCertificateInput
): Promise<Certificate> {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) {
    throw new ApiError(404, 'Enrollment not found');
  }
  if (enrollment.status !== 'active') {
    throw new ApiError(
      400,
      `Cannot issue a certificate for an enrollment in "${enrollment.status}" status`
    );
  }

  const course = await requireCourse(enrollment.courseId);
  if (!(await canManageCourseContent(course, viewer.userId))) {
    throw new ApiError(403, 'You do not have access to this course');
  }

  const existing = await prisma.certificate.findUnique({ where: { enrollmentId } });
  if (existing) {
    throw new ApiError(409, 'A certificate has already been issued for this enrollment');
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: enrollment.studentId },
  });
  if (!profile) {
    throw new ApiError(404, 'Student profile not found');
  }

  const issuingBody = input.issuingBody ?? DEFAULT_ISSUING_BODY;
  const token = randomBytes(24).toString('hex');
  const verifyUrl = `${env.publicAppUrl}/verify/${token}`;
  const issuedAt = new Date();

  const pdfBuffer = await generateCertificatePdf({
    studentName: profile.name,
    courseTitle: course.title,
    issuingBody,
    issuedAt,
    verifyUrl,
  });

  // Upload the PDF as a private raw asset in Cloudinary.
 const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: 'raw',
      type: 'private',
      public_id: `certificates/${token}.pdf`,
      overwrite: false,
    },
    (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      if (!result) {
        reject(new Error('Cloudinary did not return an upload result'));
        return;
      }

      resolve(result);
    }
  );

  uploadStream.end(pdfBuffer);
});

  const certificate = await prisma.certificate.create({
    data: {
      studentId: enrollment.studentId,
      courseId: course.id,
      enrollmentId: enrollment.id,
      courseTitle: course.title,
      issuingBody,
      token,
      pdfKey: uploadResult.public_id,
      issuedAt,
    },
  });

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: 'completed', completedAt: issuedAt },
  });

  await createNotification(
    enrollment.studentId,
    'certificate_issued',
    `Certificate issued for ${course.title}`,
    `Issued by ${issuingBody}`
  );

  return certificate;
}

export async function listMyCertificates(studentId: string): Promise<Certificate[]> {
  return prisma.certificate.findMany({
    where: { studentId },
    orderBy: { issuedAt: 'desc' },
  });
}

export interface CertificateVerificationResult {
  valid: boolean;
  studentName?: string;
  courseTitle?: string;
  issuingBody?: string;
  issuedAt?: Date;
}

// Deliberately returns only non-sensitive confirmation data — this is the
// public, unauthenticated, rate-limited endpoint.
export async function verifyCertificate(
  token: string
): Promise<CertificateVerificationResult> {
  const certificate = await prisma.certificate.findUnique({ where: { token } });
  if (!certificate) {
    return { valid: false };
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: certificate.studentId },
  });

  return {
    valid: true,
    studentName: profile?.name ?? 'Unknown',
    courseTitle: certificate.courseTitle,
    issuingBody: certificate.issuingBody,
    issuedAt: certificate.issuedAt,
  };
}

export async function getCertificateDownloadUrl(certificate: Certificate): Promise<string> {
  return cloudinary.utils.private_download_url(
    certificate.pdfKey,
    'pdf',
    {
      resource_type: 'raw',
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      attachment: true,
    }
  );
}
