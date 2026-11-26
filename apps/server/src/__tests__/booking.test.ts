import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Role } from '@forge-loom/shared-types';
import { buildApp, connectDb, disconnectDb, createTestUser } from './helpers.js';
import { prisma } from '../config/prisma.js';

const app = buildApp();

describe('bookings reschedule & meeting links', () => {
  const createdBookingIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await disconnectDb();
  });

  it('sets a default meeting link on create and lets mentor or student reschedule an upcoming session', async () => {
    const mentor = await createTestUser(Role.Mentor);
    const student = await createTestUser(Role.Student);
    const outsider = await createTestUser(Role.Mentor);
    createdUserIds.push(mentor.user.id, student.user.id, outsider.user.id);

    const mentorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: mentor.email, password: mentor.password });
    const mentorToken = mentorLogin.body.accessToken as string;

    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: student.password });
    const studentToken = studentLogin.body.accessToken as string;

    const outsiderLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: outsider.email, password: outsider.password });
    const outsiderToken = outsiderLogin.body.accessToken as string;

    const initialAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        counterpartEmail: student.email,
        title: 'Sprint 1 Check-in',
        scheduledAt: initialAt,
        agenda: ['Review architecture', 'Plan Sprint 2'],
      });

    expect(created.status).toBe(201);
    const bookingId = created.body.booking.id as string;
    createdBookingIds.push(bookingId);
    expect(created.body.booking.meetingLink).toBe('https://meet.google.com/forgeloom-mentor-1');
    expect(created.body.booking.agenda).toEqual(['Review architecture', 'Plan Sprint 2']);

    // Invalid date rejected with 400
    const badReschedule = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ scheduledAt: 'not-a-date' });
    expect(badReschedule.status).toBe(400);

    // Non-participant blocked with 403
    const forbiddenReschedule = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ scheduledAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() });
    expect(forbiddenReschedule.status).toBe(403);

    // Mentor reschedules
    const nextAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const mentorReschedule = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ scheduledAt: nextAt, status: 'upcoming' });

    expect(mentorReschedule.status).toBe(200);
    expect(mentorReschedule.body.booking.scheduledAt).toBe(nextAt);

    // Student reschedules
    const studentNextAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const studentReschedule = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ scheduledAt: studentNextAt, status: 'upcoming' });

    expect(studentReschedule.status).toBe(200);
    expect(studentReschedule.body.booking.scheduledAt).toBe(studentNextAt);
  });
});
