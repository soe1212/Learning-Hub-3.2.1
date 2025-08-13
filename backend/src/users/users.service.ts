import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profilesRepository: Repository<UserProfile>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createProfile(userId: string): Promise<UserProfile> {
    const profile = this.profilesRepository.create({
      userId,
      country: 'United States',
      timezone: 'America/New_York',
    });

    return this.profilesRepository.save(profile);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.findById(userId);

    // Update user basic info
    if (updateProfileDto.firstName || updateProfileDto.lastName) {
      await this.usersRepository.update(userId, {
        firstName: updateProfileDto.firstName || user.firstName,
        lastName: updateProfileDto.lastName || user.lastName,
      });
    }

    // Update profile
    const profileData = { ...updateProfileDto };
    delete profileData.firstName;
    delete profileData.lastName;

    await this.profilesRepository.upsert(
      {
        userId,
        ...profileData,
      },
      ['userId'],
    );

    return this.findById(userId);
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    role?: string;
    search?: string;
  }) {
    const { limit = 50, offset = 0, role, search } = options;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.isVerified',
        'user.isActive',
        'user.createdAt',
        'user.lastLogin',
      ]);

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }
}