import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRepository } from './user.repository';

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
}
