/*
  Warnings:

  - You are about to drop the column `checkIn` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `checkInLat` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `checkInLong` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `checkOut` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutLat` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutLong` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `imageProof` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `officeId` on the `users` table. All the data in the column will be lost.
  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[nik]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tanggal` to the `attendances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `attendances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jam_masuk` to the `offices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jam_pulang` to the `offices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alasan` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jenis` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tanggal_mulai` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tanggal_selesai` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nama` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nik` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `attendances` DROP FOREIGN KEY `attendances_userId_fkey`;

-- DropForeignKey
ALTER TABLE `permissions` DROP FOREIGN KEY `permissions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_officeId_fkey`;

-- DropIndex
DROP INDEX `attendances_userId_fkey` ON `attendances`;

-- DropIndex
DROP INDEX `permissions_userId_fkey` ON `permissions`;

-- DropIndex
DROP INDEX `users_officeId_fkey` ON `users`;

-- AlterTable
ALTER TABLE `attendances` DROP COLUMN `checkIn`,
    DROP COLUMN `checkInLat`,
    DROP COLUMN `checkInLong`,
    DROP COLUMN `checkOut`,
    DROP COLUMN `checkOutLat`,
    DROP COLUMN `checkOutLong`,
    DROP COLUMN `date`,
    DROP COLUMN `status`,
    DROP COLUMN `userId`,
    ADD COLUMN `foto_masuk` VARCHAR(255) NULL,
    ADD COLUMN `jam_masuk` DATETIME(3) NULL,
    ADD COLUMN `jam_pulang` DATETIME(3) NULL,
    ADD COLUMN `lat_masuk` DOUBLE NULL,
    ADD COLUMN `lng_masuk` DOUBLE NULL,
    ADD COLUMN `metode_masuk` VARCHAR(50) NULL,
    ADD COLUMN `status_masuk` VARCHAR(50) NULL,
    ADD COLUMN `tanggal` DATE NOT NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `offices` ADD COLUMN `jam_masuk` VARCHAR(5) NOT NULL,
    ADD COLUMN `jam_pulang` VARCHAR(5) NOT NULL;

-- AlterTable
ALTER TABLE `permissions` DROP COLUMN `endDate`,
    DROP COLUMN `imageProof`,
    DROP COLUMN `reason`,
    DROP COLUMN `startDate`,
    DROP COLUMN `type`,
    DROP COLUMN `userId`,
    ADD COLUMN `alasan` TEXT NOT NULL,
    ADD COLUMN `approved_by` INTEGER NULL,
    ADD COLUMN `bukti_file` VARCHAR(255) NULL,
    ADD COLUMN `jenis` ENUM('IZIN', 'SAKIT', 'CUTI') NOT NULL,
    ADD COLUMN `tanggal_mulai` DATE NOT NULL,
    ADD COLUMN `tanggal_selesai` DATE NOT NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `name`,
    DROP COLUMN `officeId`,
    ADD COLUMN `nama` VARCHAR(100) NOT NULL,
    ADD COLUMN `nik` VARCHAR(50) NOT NULL,
    ADD COLUMN `office_id` INTEGER NULL,
    MODIFY `role` ENUM('KARYAWAN', 'HRD', 'ADMIN') NOT NULL DEFAULT 'KARYAWAN';

-- CreateIndex
CREATE UNIQUE INDEX `users_nik_key` ON `users`(`nik`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_office_id_fkey` FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
