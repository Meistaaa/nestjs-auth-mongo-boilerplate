import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ProjectionType, QueryOptions, UpdateQuery } from 'mongoose';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  PaginateOptions,
  PaginatedResult,
  paginateModel,
} from '../../common/utils/pagination.util';
import { User, UserDocument } from './user.schema';

type UserFilter = Record<string, unknown>;

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  create(payload: Partial<User>) {
    return this.userModel.create(payload);
  }

  findById(
    id: string,
    projection?: ProjectionType<User>,
    options?: QueryOptions<User>,
  ) {
    return this.userModel.findById(id, projection, options).exec();
  }

  findOne(
    filter: UserFilter,
    projection?: ProjectionType<User>,
    options?: QueryOptions<User>,
  ) {
    return this.userModel.findOne(filter, projection, options).exec();
  }

  findMany(
    filter: UserFilter = {},
    projection?: ProjectionType<User>,
    options: QueryOptions<User> = {},
  ) {
    return this.userModel.find(filter, projection, options).exec();
  }

  paginate(
    query: PaginationQueryDto,
    options: PaginateOptions<User> = {},
  ): Promise<PaginatedResult<User>> {
    return paginateModel(this.userModel, query, options);
  }

  updateById(
    id: string,
    update: UpdateQuery<User>,
    options: QueryOptions<UserDocument> = { new: true },
  ) {
    return this.userModel.findByIdAndUpdate(id, update, options).exec();
  }

  updateOne(
    filter: UserFilter,
    update: UpdateQuery<User>,
    options: QueryOptions<UserDocument> = { new: true },
  ) {
    return this.userModel.findOneAndUpdate(filter, update, options).exec();
  }

  deleteById(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  count(filter: UserFilter = {}) {
    return this.userModel.countDocuments(filter).exec();
  }

  exists(filter: UserFilter) {
    return this.userModel.exists(filter).then((result) => Boolean(result));
  }
}
