const userModel = require('../models/user-model');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const tokenService = require('../service/token-service');
const UserDto = require('../dtos/user-dto')
const mailService = require('../service/mail-service');
const ApiError = require('../exceptions/api-error')

class UserService{
    async registration(email, password){
        const candidate = await userModel.findOne({email})
        
        if(candidate){
            throw ApiError.BadRequest(`This e-mail ${email} is already registered`)
        }

        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink = uuid.v4();

        const user = await userModel.create({email, password: hashPassword, activationLink})
        await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`)

        const userDto = new UserDto(user)
        const tokens = tokenService.generateTokens({...userDto})

        await tokenService.saveToken(userDto.id, tokens.refreshToken)

        return {
            ...tokens,
            user: userDto
        }
    }

    async activate(activationLink){
        const user = await userModel.findOne({activationLink})

        if(!user){
            throw ApiError.BadRequest('It is not correct activate link')
        }

        user.isActivated = true
        await user.save()
    }
}

module.exports = new UserService();