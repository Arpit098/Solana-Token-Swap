use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

declare_id!("F1r79aupgZuTSQ8WNqyJA2LrLhqgF9FNUEgZLcXyP9NE");

#[program]
pub mod dex {
    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>,
        id: u64,
        token_a_offered: u64,
        token_b_wanted: u64,
    ) -> Result<()> {
        // Transfer tokens from maker to vault
        transfer_tokens(
            &ctx.accounts.maker_token_account_a,
            &ctx.accounts.vault,
            &token_a_offered,
            &ctx.accounts.token_mint_a,
            &ctx.accounts.maker,
            &ctx.accounts.token_program,
        )?;

        // Create offer account
        ctx.accounts.offer.set_inner(Offer {
            id,
            maker: ctx.accounts.maker.key(),
            token_mint_a: ctx.accounts.token_mint_a.key(),
            token_mint_b: ctx.accounts.token_mint_b.key(),
            token_a_offered,
            token_b_wanted,
            bump: ctx.bumps.offer,
        });
        Ok(())
    }

    pub fn take_offer(ctx: Context<TakeOffer>) -> Result<()> {
        //transfer tokens to the maker
        transfer_tokens(
            &ctx.accounts.taker_token_account_b,
            &ctx.accounts.maker_token_account_b,
            &ctx.accounts.offer.token_b_wanted,
            &ctx.accounts.token_mint_b,
            &ctx.accounts.taker,
            &ctx.accounts.token_program,
        )?;

        //withdraw and close part
        let seeds = &[
            &ctx.accounts.maker.to_account_info().key.as_ref(),
            &ctx.accounts.offer.id.to_le_bytes()[..],
            &[ctx.accounts.offer.bump],
        ];
        let signer_seeds = [&seeds[..]];

        let accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.taker_token_account_a.to_account_info(),
            mint: ctx.accounts.token_mint_a.to_account_info(),
            authority: ctx.accounts.offer.to_account_info(),
        };
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        transfer_checked(
            cpi_context,
            ctx.accounts.vault.amount,
            ctx.accounts.token_mint_a.decimals,
        )?;

        let accounts = CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.taker.to_account_info(),
            authority: ctx.accounts.offer.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        close_account(cpi_context)
    }

   
}

fn transfer_tokens<'info>(
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    amount: &u64,
    mint: &InterfaceAccount<'info, Mint>,
    authority: &Signer<'info>,
    token_program: &Interface<'info, TokenInterface>,
) -> Result<()> {
    let transfer_accounts_options = TransferChecked {
        from: from.to_account_info(),
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };

    let cpi_context = CpiContext::new(token_program.to_account_info(), transfer_accounts_options);
    transfer_checked(cpi_context, *amount, mint.decimals)
}

#[account]
#[derive(InitSpace)]
pub struct Offer {
    pub id: u64,
    pub maker: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub token_a_offered: u64,
    pub token_b_wanted: u64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct MakeOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(mint::token_program = token_program)]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        space = 8 + Offer::INIT_SPACE,
        seeds = [b"offer", maker.key().as_ref(), id.to_le_bytes().as_ref()],
        bump
    )]
    pub offer: Account<'info, Offer>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct TakeOffer<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,

    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_a: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_b: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_b: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        has_one = token_mint_a,
        has_one = token_mint_b,
        seeds = [b"offer", maker.key().as_ref(), offer.id.to_le_bytes().as_ref()],
        bump = offer.bump
    )]
    offer: Account<'info, Offer>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program,
    )]
    vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
