import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  // BeforeEach runs before any test block runs
  beforeEach(async () => {
    // Create a fake copy of the users service.
    const users: User[] = [];
    fakeUsersService = {
      find: (email: string) => {
        const filteredUsers = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUsers);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 999999),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };

    // Create a fake DI container for testing
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    // This causes the DI to create a new instance of AuthService with all its dependencies, already initialized
    service = module.get(AuthService);
  });

  it('can create a an instance of auth service', async () => {
    // Ensure the AuthService is created successfully
    expect(service).toBeDefined();
  });

  it('creates a new user with salted and hashed password', async () => {
    const user = await service.signup('asdf@gmail.com', 'asdf');

    expect(user.password).not.toEqual('asdf');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('It throws an error if user signs up with email that is in use', async () => {
    // Redefine find method of the fakeUsersService just for this test
    await service.signup('asdf@app.com', 'passcode');
    await expect(service.signup('asdf@app.com', 'passcode')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws if sign in is called with an unused email ', async () => {
    await expect(service.signin('asdf@app.com', 'passcode')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws if an invalid password is provided ', async () => {
    await service.signup('asdf@app.com', 'passcode');

    await expect(
      service.signin('asdf@app.com', 'anotherpasscode'),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns a user if correct password is provided', async () => {
    await service.signup('asdf@app.com', 'passcode');

    const user = await service.signin('asdf@app.com', 'passcode');
    expect(user).toBeDefined();
  });
});
