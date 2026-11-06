using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GharMitra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReferralConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Referrals_Customers_RefereeCustomerId",
                table: "Referrals");

            migrationBuilder.DropForeignKey(
                name: "FK_Referrals_Customers_ReferrerCustomerId",
                table: "Referrals");

            migrationBuilder.AlterColumn<decimal>(
                name: "ReferrerReward",
                table: "Referrals",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "ReferralCode",
                table: "Referrals",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "RefereeEmail",
                table: "Referrals",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "RefereeDiscount",
                table: "Referrals",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "ReferralCode",
                table: "Customers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferralCode",
                table: "Referrals",
                column: "ReferralCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_ReferralCode",
                table: "Customers",
                column: "ReferralCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponRedemptions_CreatedAtUtc",
                table: "CouponRedemptions",
                column: "CreatedAtUtc");

            migrationBuilder.AddForeignKey(
                name: "FK_Referrals_Customers_RefereeCustomerId",
                table: "Referrals",
                column: "RefereeCustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Referrals_Customers_ReferrerCustomerId",
                table: "Referrals",
                column: "ReferrerCustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Referrals_Customers_RefereeCustomerId",
                table: "Referrals");

            migrationBuilder.DropForeignKey(
                name: "FK_Referrals_Customers_ReferrerCustomerId",
                table: "Referrals");

            migrationBuilder.DropIndex(
                name: "IX_Referrals_ReferralCode",
                table: "Referrals");

            migrationBuilder.DropIndex(
                name: "IX_Customers_ReferralCode",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_CouponRedemptions_CreatedAtUtc",
                table: "CouponRedemptions");

            migrationBuilder.AlterColumn<decimal>(
                name: "ReferrerReward",
                table: "Referrals",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)",
                oldPrecision: 10,
                oldScale: 2);

            migrationBuilder.AlterColumn<string>(
                name: "ReferralCode",
                table: "Referrals",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "RefereeEmail",
                table: "Referrals",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "RefereeDiscount",
                table: "Referrals",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)",
                oldPrecision: 10,
                oldScale: 2);

            migrationBuilder.AlterColumn<string>(
                name: "ReferralCode",
                table: "Customers",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Referrals_Customers_RefereeCustomerId",
                table: "Referrals",
                column: "RefereeCustomerId",
                principalTable: "Customers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Referrals_Customers_ReferrerCustomerId",
                table: "Referrals",
                column: "ReferrerCustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
