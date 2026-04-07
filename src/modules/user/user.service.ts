import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRepository } from './user.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  findAll(query: PaginationQueryDto) {
    return this.userRepository.paginate(query, {
      filter: { isDeleted: false },
      options: {
        sort: { createdAt: -1 },
      },
    });
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user.toObject());
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findById(userId);

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    const nextName = dto.name ?? user.name ?? '';
    const nextAddress = dto.address ?? user.address ?? '';
    const nextPhoneNumber = dto.phoneNumber ?? user.phoneNumber ?? '';
    const nextProfilePicture = dto.profilePicture ?? user.profilePicture ?? '';
    const isProfileCompleted = [
      nextName,
      nextAddress,
      nextPhoneNumber,
      nextProfilePicture,
    ].every((value) => value.trim().length > 0);

    const updatedUser = await this.userRepository.updateById(userId, {
      $set: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phoneNumber !== undefined
          ? { phoneNumber: dto.phoneNumber }
          : {}),
        ...(dto.profilePicture !== undefined
          ? { profilePicture: dto.profilePicture }
          : {}),
        isProfileCompleted,
      },
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(updatedUser.toObject());
  }

  private sanitizeUser<T extends object>(user: T) {
    Reflect.deleteProperty(user, 'password');
    Reflect.deleteProperty(user, 'emailVerificationToken');
    Reflect.deleteProperty(user, 'emailVerificationExpires');
    Reflect.deleteProperty(user, 'resetPasswordToken');
    Reflect.deleteProperty(user, 'resetPasswordExpires');

    return user;
  }
}
