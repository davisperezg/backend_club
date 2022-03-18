import {
  HttpException,
  HttpStatus,
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Module, ModuleDocument } from '../schemas/module.schema';
import { Model } from 'mongoose';
import { MenuService } from 'src/menu/services/menu.service';
import { RoleDocument } from 'src/role/schemas/role.schema';

@Injectable()
export class ModuleService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Module.name) private moduleModel: Model<ModuleDocument>,
    @InjectModel('Role') private roleModel: Model<RoleDocument>,
    //@InjectModel('User') private userModel: Model<UserDocument>,
    private readonly menuService: MenuService,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.moduleModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      //ADD MODULES
      const getMenus = await this.menuService.findbyName([
        'Usuarios',
        'Roles',
        'Modulos',
        'Permisos',
      ]);

      const findMenus = getMenus.map((men) => men._id);

      await Promise.all([
        new this.moduleModel({
          name: 'Administración de sistema',
          status: true,
          menu: findMenus,
        }).save(),
        new this.moduleModel({ name: 'Almacen', status: true }).save(),
        new this.moduleModel({ name: 'Mantenimiento', status: true }).save(),
        new this.moduleModel({ name: 'Comprobantes', status: true }).save(),
        new this.moduleModel({
          name: 'Consultas y Reportes',
          status: true,
        }).save(),
      ]);

      //ADD ROL
      const getModules = await this.findbyNames([
        'Administración de sistema',
        'Almacen',
        'Mantenimiento',
        'Comprobantes',
        'Consultas y Reportes',
      ]);

      const findModules = getModules.map((mo) => mo._id);

      await Promise.all([
        new this.roleModel({
          name: 'OWNER',
          status: true,
          module: findModules,
        }).save(),
        new this.roleModel({
          name: 'SUPER ADMINISTRADOR',
          status: true,
        }).save(),
        new this.roleModel({ name: 'ADMINISTRADOR', status: true }).save(),
      ]);
    } catch (e) {
      throw new Error(`Error en ModuleService.onModuleInit ${e}`);
    }
  }

  async findAll(user: any): Promise<Module[]> {
    const { findUser } = user;
    let modules = [];
    if (findUser.role.name === 'OWNER') {
      modules = await this.moduleModel.find().populate({
        path: 'menu',
      });
    } else {
      modules = findUser.role.module;
    }
    return modules;
  }

  async findOne(id: string): Promise<Module> {
    return this.moduleModel.findOne({ _id: id }).populate({
      path: 'menu',
    });
  }

  async findAllDeleted(): Promise<Module[]> {
    return this.moduleModel.find({ status: false }).populate({
      path: 'menu',
    });
  }

  //Find modules by names
  async findbyNames(name: any[]): Promise<ModuleDocument[]> {
    const modules = await this.moduleModel.find({
      name: { $in: name },
      status: true,
    });

    if (!modules || modules.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Hay un modulo inactivo o no existe.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return modules;
  }

  //Find modules by names
  async findbyName(name: string): Promise<ModuleDocument> {
    const module = await this.moduleModel.findOne({ name, status: true });

    if (!module) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Hay un modulo inactivo o no existe.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return module;
  }

  //Add a single module
  async create(createMenu: Module): Promise<Module> {
    const { menu, name } = createMenu;

    const findModule = await this.moduleModel.findOne({ name });

    if (findModule) {
      //No se puede crear el elemento
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          type: 'UNIQUE',
          message: 'Item cannot be created',
        },
        HttpStatus.CONFLICT,
      );
    }

    const getMenus = await this.menuService.findbyName(menu);
    const findMenus = getMenus.map((men) => men._id);

    const modifyData: Module = {
      ...createMenu,
      status: true,
      menu: findMenus,
    };

    const createdModule = new this.moduleModel(modifyData);
    return createdModule.save();
  }

  //Delete a single module
  async delete(id: string): Promise<boolean> {
    let result = false;

    try {
      await this.moduleModel.findByIdAndUpdate(id, { status: false });
      result = true;
    } catch (e) {
      throw new Error(`Error en ModuleService.delete ${e}`);
    }

    return result;
  }

  //Put a single module
  async update(id: string, bodyModule: Module): Promise<Module> {
    const { status, menu } = bodyModule;

    if (status) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const getMenus = await this.menuService.findbyName(menu);
    const findMenus = getMenus.map((men) => men._id);

    const modifyData: Module = {
      ...bodyModule,
      menu: findMenus,
    };

    return await this.moduleModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }

  //Restore a single module
  async restore(id: string): Promise<boolean> {
    let result = false;

    try {
      await this.moduleModel.findByIdAndUpdate(id, { status: true });
      result = true;
    } catch (e) {
      throw new Error(`Error en ModuleService.restore ${e}`);
    }

    return result;
  }
}
