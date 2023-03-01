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

    async login(email, password){
        const user = await userModel.findOne({email});

        if(!user){
            throw ApiError.BadRequest('User with this email not found');
        }

        const isPassEquals = await bcrypt.compare(password, user.password);
        
        if(!isPassEquals){
            throw ApiError.BadRequest('Not right password');
        }

        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({...userDto});
        
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {
            ...tokens,
            user: userDto
        };
    }

    async logout(refreshToken){
        const token = await tokenService.removeToken(refreshToken);

        return token;
    }

    async refresh(refreshToken){
        if(!refreshToken){
            throw ApiError.UnauthorizedError();
        }

        const userData = tokenService.validateRefreshToken(refreshToken);
        const tokenFromDb = tokenService.findToken(refreshToken);

        if(!userData || !tokenFromDb){
            throw ApiError.UnauthorizedError();
        }

        const user = await userModel.findById(userData.id);
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({...userDto});
        
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return{
            ...tokens,
            user: userDto
        }
    }

    async getAllUsers(){
        const users = await userModel.find();
        console.log(users);
        return users;
    }
}

module.exports = new UserService();