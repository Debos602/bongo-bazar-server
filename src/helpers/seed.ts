import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import config from "../config";
import prisma from "../shared/prisma";

const seedSuperAdmin = async () => {
    try {
        const isExistSuperAdmin = await prisma.user.findFirst({
            where: {
                role: Role.SUPER_ADMIN
            }
        });

        if (isExistSuperAdmin) {
            console.log("Super admin already exists!");
            return;
        }

        const hashedPassword = await bcrypt.hash(
            config.superAdminPassword as string,
            Number(config.salt_round)
        );

        const superAdminData = await prisma.user.create({
            data: {
                email: config.superAdminEmail as string,
                name: "Super Admin",
                phone: "01234567890",
                password: hashedPassword,
                role: Role.SUPER_ADMIN
            }
        });

        console.log("Super Admin Created Successfully!", superAdminData);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
};

export default seedSuperAdmin;