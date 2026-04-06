import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  // 🔹 Basic Info
  @Prop({ trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  // 🔹 Status
  @Prop({ default: false })
  isProfileCompleted: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop()
  blockedAt?: Date;

  @Prop()
  blockedReason?: string;

  // 🔹 Security / Auth
  @Prop()
  lastLoginAt?: Date;

  @Prop()
  passwordChangedAt?: Date;

  // 🔹 Roles
  @Prop({ enum: ['user', 'admin'], default: 'user' })
  role: string;

  // 🔹 Verification / Reset
  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  // 🔹 Device Tracking (VERY useful for sessions)
  @Prop()
  deviceToken?: string;

  @Prop()
  platform?: 'ios' | 'android' | 'web';

  // 🔹 Soft Delete
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
