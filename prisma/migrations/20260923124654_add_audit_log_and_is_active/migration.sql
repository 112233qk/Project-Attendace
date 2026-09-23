/*
  Warnings:

  - You are about to alter the column `metode_masuk` on the `attendances` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `VarChar(50)`.
  - You are about to alter the column `status_masuk` on the `attendances` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(4))` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE `attendances` MODIFY `metode_masuk` VARCHAR(50) NULL,
    MODIFY `status_masuk` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(50) NOT NULL,
    `entity` VARCHAR(50) NOT NULL,
    `entity_id` INTEGER NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `description` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_user_id_idx`(`user_id`),
    INDEX `audit_logs_entity_entity_id_idx`(`entity`, `entity_id`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
