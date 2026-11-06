using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GharMitra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReferralSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasBeenReferred",
                table: "Customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ReferralCode",
                table: "Customers",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Referrals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReferrerCustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    RefereeCustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferralCode = table.Column<string>(type: "text", nullable: false),
                    RefereeEmail = table.Column<string>(type: "text", nullable: true),
                    IsRedeemed = table.Column<bool>(type: "boolean", nullable: false),
                    RedeemedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RefereeDiscount = table.Column<decimal>(type: "numeric", nullable: false),
                    ReferrerReward = table.Column<decimal>(type: "numeric", nullable: false),
                    RefereeCouponId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferrerCouponId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Referrals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Referrals_Customers_RefereeCustomerId",
                        column: x => x.RefereeCustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Referrals_Customers_ReferrerCustomerId",
                        column: x => x.ReferrerCustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_RefereeCustomerId",
                table: "Referrals",
                column: "RefereeCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferrerCustomerId",
                table: "Referrals",
                column: "ReferrerCustomerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Referrals");

            migrationBuilder.DropColumn(
                name: "HasBeenReferred",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "ReferralCode",
                table: "Customers");
        }
    }
}
