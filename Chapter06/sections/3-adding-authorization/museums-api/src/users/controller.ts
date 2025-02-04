import { userToUserDto } from "./adapter.ts";
import {
  LoginPayload,
  RegisterPayload,
  User,
  UserController,
  UserRepository,
} from "./types.ts";
import { hashWithSalt } from "./util.ts";
import { AuthRepository } from "../deps.ts";

interface ControllerDependencies {
  userRepository: UserRepository;
  authRepository: AuthRepository;
}

export class Controller implements UserController {
  userRepository: UserRepository;
  authRepository: AuthRepository;

  constructor({ userRepository, authRepository }: ControllerDependencies) {
    this.userRepository = userRepository;
    this.authRepository = authRepository;
  }

  private async comparePassword(password: string, user: User) {
    const hashedPassword = hashWithSalt(password, user.salt);

    if (hashedPassword === user.hash) {
      return Promise.resolve(true);
    }

    return Promise.reject(false);
  }

  public async register(payload: RegisterPayload) {
    if (await this.userRepository.exists(payload.username)) {
      return Promise.reject("Username already exists");
    }

    const createdUser = await this.userRepository.create(
      payload.username,
      payload.password,
    );

    return userToUserDto(createdUser);
  }

  public async login(payload: LoginPayload) {
    try {
      const user = await this.userRepository.getByUsername(payload.username);

      await this.comparePassword(payload.password, user);

      const token = await this.authRepository.generateToken(user.username);

      return { user: userToUserDto(user), token };
    } catch (e) {
      throw new Error("Username and password combination is not correct");
    }
  }
}
