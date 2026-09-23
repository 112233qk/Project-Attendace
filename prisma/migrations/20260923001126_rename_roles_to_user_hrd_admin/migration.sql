/*
  Warnings:

  - You are about to alter the column `metode_masuk` on the `attendances` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(2))`.
  - You are about to alter the column `status_masuk` on the `attendances` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `attendances` MODIFY `metode_masuk` ENUM('GPS', 'MANUAL') NULL,
    MODIFY `status_masuk` ENUM('TEPAT_WAKTU', 'TERLAMBAT') NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `foto_profil` VARCHAR(255) NULL;
