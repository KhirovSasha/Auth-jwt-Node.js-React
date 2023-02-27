const userModel = require('../models/user-model');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const tokenService = require('../service/token-service');
const UserDto = require('../dtos/user-dto')

class UserService{
    async registration(email, password){
        const candidate = await userModel.findOne({email})
        
        if(candidate){
            throw new Error(`This e-mail ${email} is already registered`)
        }

        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink = uuid.v4();
        const user = await userModel.create({email, password: hashPassword, activationLink})

        const userDto = new UserDto(user)
        const tokens = tokenService.generateTokens({...userDto})

        await tokenService.saveToken(userDto.id, tokens.refreshToken)

        return {
            ...tokens,
            user: userDto
        }
    }
}

module.exports = new UserService();